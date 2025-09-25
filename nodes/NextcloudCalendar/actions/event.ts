import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { initClient, resolveOrganizerInfo } from '../helpers/client';
import { IEventCreate, IEventUpdate, IEventResponse } from '../interfaces/event';
import { findCalendar } from './calendar';
import { parseICalEvent } from '../helpers/parser';

interface IAttendeeICal {
    displayName?: string;
    role?: string;
    rsvp?: boolean;
    email?: string;
}

interface IEventICal {
    uid?: string;
    title?: string;
    start?: string | Date;
    end?: string | Date;
    description?: string;
    location?: string;
    attendees?: IAttendeeICal[];
    credentials?: { username?: string; email?: string };
    timeZone?: string;
    organizerEmail?: string;
    organizerName?: string;
    method?: 'PUBLISH' | 'REQUEST' | 'CANCEL';
    sequence?: number;
}

export async function getEvents(
    context: IExecuteFunctions,
    calendarName: string,
    start: string,
    end: string,
) {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, calendarName);

    const response = await client.fetchCalendarObjects({
        calendar,
        timeRange: {
            start: start,
            end: end,
        },
    });

    return response.map(parseICalEvent);
}

export async function getEvent(
    context: IExecuteFunctions,
    calendarName: string,
    eventId: string,
): Promise<IEventResponse> {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, calendarName);

    const events = await client.fetchCalendarObjects({
        calendar,
        filters: [{
            'comp-filter': {
                _attributes: {
                    name: 'VCALENDAR',
                },
                'comp-filter': {
                    _attributes: {
                        name: 'VEVENT',
                        test: 'allof',
                    },
                    'prop-filter': {
                        _attributes: {
                            name: 'UID',
                            test: 'equals',
                        },
                        'text-match': {
                            _attributes: {
                                'match-type': 'equals',
                            },
                            _text: eventId,
                        },
                    },
                },
            },
        }],
    });

    if (!events || events.length === 0) {
        throw new Error(`Event with ID "${eventId}" not found`);
    }

    return parseICalEvent(events[0]);
}

export async function createEvent(
    context: IExecuteFunctions,
    data: IEventCreate,
) {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, data.calendarName);
    const credentials = await context.getCredentials('nextcloudCalendarApi');

    const normalizeTZ = (tz: unknown): string | undefined => {
        if (typeof tz === 'string') return tz || undefined;
        if (tz && typeof tz === 'object') {
            if ('value' in tz && typeof (tz as { value?: unknown }).value === 'string') {
                return (tz as { value?: string }).value || undefined;
            }
            if ('id' in tz && typeof (tz as { id?: unknown }).id === 'string') {
                return (tz as { id?: string }).id || undefined;
            }
        }
        return undefined;
    };

    // Organizer-E-Mail automatisch aus Credentials ableiten (username@hostname)
    const organizerInfo = await resolveOrganizerInfo(context);
    const organizerEmail = organizerInfo.email;

    const sendInvitations = !!(data as unknown as { sendInvitations?: boolean }).sendInvitations;
    const hasAttendees = Array.isArray(data.attendees) && data.attendees.length > 0;
    const method: 'REQUEST' | 'PUBLISH' | 'CANCEL' = (sendInvitations && hasAttendees) ? 'REQUEST' : 'PUBLISH';

    const event = {
        ...data,
        uid: `n8n-${Date.now()}@nextcloud-calendar`,
        credentials: credentials,
        timeZone: normalizeTZ((data as unknown as { timeZone?: unknown }).timeZone) || 'UTC',
        organizerEmail,
        organizerName: organizerInfo.displayName || (credentials.username as string) || 'n8n',
        method,
    };

        console.log(`Erstelle Termin mit UID: ${event.uid}`);

    const iCalString = generateICalString(event);
    console.log(`iCal-String: ${iCalString}`);

    // Verwende die funktionierende Methode aus Version 0.1.36: Keine Header
    const response = await client.createCalendarObject({
        calendar,
        filename: `${event.uid}.ics`,
        iCalString: iCalString,
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Prefer': 'return=representation',
            'If-None-Match': '*',
        },
    });

    console.log(`Response von createCalendarObject:`, response);

    // Verifikation mit Retry (Nextcloud kann verzögert schreiben)
    const calId =
        (typeof calendar.url === 'string' && calendar.url)
            ? calendar.url
            : ((typeof calendar.displayName === 'string' && calendar.displayName) ? calendar.displayName : data.calendarName);
    let createdEvent;
    const maxAttempts = 4;
    const delay = async (ms: number) => new Promise(r => setTimeout(r, ms));
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            createdEvent = await getEvent(context, calId as string, event.uid);
            break;
        } catch (error) {
            if (attempt === maxAttempts) {
                const errMessage = (error as Error)?.message || 'Unknown error';
                throw new NodeOperationError(context.getNode(), `Event could not be verified after creation. Server did not return the created UID. Details: ${errMessage}`, {
                    description: 'Please ensure valid App Password (Basic Auth), no throttling (brute force), and a correct calendar URL/ID.',
                });
            }
            await delay(600 * attempt);
        }
    }

    // Verbesserte Rückgabe als eigenes Objekt
    const result = {
        success: true,
        message: 'Termin erfolgreich erstellt',
        uid: event.uid,
        details: {
            title: createdEvent?.title ?? event.title,
            start: createdEvent?.start ?? (event.start as string),
            end: createdEvent?.end ?? (event.end as string),
            attendeesCount: event.attendees?.length || 0,
        }
    };

    if (response && typeof response === 'object') {
        if ('url' in response) {
            (result as { url?: string; etag?: string }).url = (response as { url?: string }).url;
        }
        if ('etag' in response) {
            const etagValue = (response as { etag?: unknown }).etag;
            (result as { url?: string; etag?: string }).etag = typeof etagValue === 'string' ? etagValue : String(etagValue);
        }
    }

    return result;
}

export async function updateEvent(
    context: IExecuteFunctions,
    data: IEventUpdate,
) {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, data.calendarName);

    const existingEvent = await getEvent(context, data.calendarName, data.eventId);
    const updatedEvent = {
        ...existingEvent,
        ...data,
    };

    const events = await client.fetchCalendarObjects({
        calendar,
        filters: [{
            'comp-filter': {
                _attributes: {
                    name: 'VCALENDAR',
                },
                'comp-filter': {
                    _attributes: {
                        name: 'VEVENT',
                        test: 'allof',
                    },
                    'prop-filter': {
                        _attributes: {
                            name: 'UID',
                            test: 'equals',
                        },
                        'text-match': {
                            _attributes: {
                                'match-type': 'equals',
                            },
                            _text: data.eventId,
                        },
                    },
                },
            },
        }],
    });

    if (!events || events.length === 0) {
        throw new Error(`Event with ID "${data.eventId}" not found`);
    }

    // Spezielle Header für Einladungen
    const headers: Record<string, string> = {};
    if (data.attendees && data.attendees.length > 0) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['Schedule-Reply'] = 'true';
        headers['Prefer'] = 'return=representation';
    }

    // SEQUENCE erhöhen, wenn vorhandene SEQUENCE ausgelesen werden kann
    let nextSequence = 1;
    try {
        const existing = await getEvent(context, data.calendarName, data.eventId);
        if (existing && typeof existing.sequence === 'number') {
            nextSequence = existing.sequence + 1;
        }
    } catch {}

    const response = await client.updateCalendarObject({
        calendarObject: {
            ...events[0],
            data: generateICalString({
                ...(updatedEvent as unknown as IEventICal),
                method: (Array.isArray(updatedEvent.attendees) && updatedEvent.attendees.length > 0) ? 'REQUEST' : 'PUBLISH',
                sequence: nextSequence,
            }),
        },
        headers: headers,
    });

    // Verbesserte Rückgabe
    const result = {
        success: true,
        message: 'Termin erfolgreich aktualisiert',
        uid: data.eventId,
        details: {
            title: updatedEvent.title,
            start: updatedEvent.start,
            end: updatedEvent.end,
            attendeesCount: updatedEvent.attendees?.length || 0,
        }
    };

    if (response && typeof response === 'object') {
        if ('url' in response) {
            (result as { url?: string; etag?: string }).url = (response as { url?: string }).url;
        }
        if ('etag' in response) {
            const etagValue = (response as { etag?: unknown }).etag;
            (result as { url?: string; etag?: string }).etag = typeof etagValue === 'string' ? etagValue : String(etagValue);
        }
    }

    // Verify-after-update (optional, soft)
    try {
        await getEvent(context, data.calendarName, data.eventId);
    } catch (error) {
        console.warn('Warnung: Update konnte nicht verifiziert werden:', (error as Error).message);
    }

    return result;
}

export async function deleteEvent(
    context: IExecuteFunctions,
    calendarName: string,
    eventId: string,
) {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, calendarName);

    const events = await client.fetchCalendarObjects({
        calendar,
        filters: [{
            'comp-filter': {
                _attributes: {
                    name: 'VCALENDAR',
                },
                'comp-filter': {
                    _attributes: {
                        name: 'VEVENT',
                        test: 'allof',
                    },
                    'prop-filter': {
                        _attributes: {
                            name: 'UID',
                            test: 'equals',
                        },
                        'text-match': {
                            _attributes: {
                                'match-type': 'equals',
                            },
                            _text: eventId,
                        },
                    },
                },
            },
        }],
    });

    if (!events || events.length === 0) {
        throw new Error(`Event with ID "${eventId}" not found`);
    }

    // Optional: Stornierungen vor dem Löschen senden (METHOD:CANCEL)
    const sendCancellations = !!(context.getNodeParameter('sendCancellations', 0, true) as boolean);
    if (sendCancellations) {
        try {
            const existing = await getEvent(context, calendarName, eventId);
            const headers: Record<string, string> = {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Prefer': 'return=representation',
            };
            await client.updateCalendarObject({
                calendarObject: {
                    ...events[0],
                    data: generateICalString({
                        uid: existing.uid,
                        title: existing.title,
                        start: existing.start as string,
                        end: existing.end as string,
                        attendees: (existing.attendees || []).map(a => ({
                            email: String(a.email || ''),
                            displayName: typeof a.displayName === 'string' ? a.displayName : undefined,
                            role: (a.role as 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR') || 'REQ-PARTICIPANT',
                            rsvp: Boolean(a.rsvp),
                        })),
                        method: 'CANCEL',
                    } as unknown as IEventICal),
                },
                headers,
            });
        } catch (error) {
            console.warn('Warnung: Cancel vor Delete fehlgeschlagen:', (error as Error).message);
        }
    }

    await client.deleteCalendarObject({
        calendarObject: events[0],
    });

    return { success: true };
}

export async function searchEvents(
    context: IExecuteFunctions,
    calendarName: string,
    searchTerm: string,
    start: string,
    end: string,
): Promise<IEventResponse[]> {
    const events = await getEvents(context, calendarName, start, end);

    return events.filter(event => {
        const searchString = searchTerm.toLowerCase();
        return (
            (event.title && event.title.toLowerCase().includes(searchString)) ||
            (event.description && event.description.toLowerCase().includes(searchString)) ||
            (event.location && event.location.toLowerCase().includes(searchString))
        );
    });
}

function generateICalString(event: IEventICal) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startDate = event.start ? new Date(event.start) : new Date();
    const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000);

    // Formatierung für lokale Zeit ohne Zeitzone (DTSTART/DTEND ohne Z)
    // Dies lässt Nextcloud die Serverzeit verwenden
    const formatDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    // iCal-String: TZ optional, ansonsten UTC; später CRLF normalisieren
    const CRLF = '\r\n';
    let iCalString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//Nextcloud Calendar Node//EN
${event.timeZone && event.timeZone !== 'UTC' ? `X-WR-TIMEZONE:${event.timeZone}\n` : ''}METHOD:${event.method || 'PUBLISH'}
BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${timestamp}
${event.timeZone && event.timeZone !== 'UTC'
        ? `DTSTART;TZID=${event.timeZone}:${formatDateTime(startDate)}`
        : `DTSTART:${formatDateTime(startDate)}Z`}
${event.timeZone && event.timeZone !== 'UTC'
        ? `DTEND;TZID=${event.timeZone}:${formatDateTime(endDate)}`
        : `DTEND:${formatDateTime(endDate)}Z`}
SUMMARY:${event.title || 'Unbenannter Termin'}
SEQUENCE:0
STATUS:CONFIRMED
`;

    if (event.description) {
        iCalString += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\n`;
    }

    if (event.location) {
        iCalString += `LOCATION:${event.location}\n`;
    }

    // ORGANIZER (automatisch aus Credentials abgeleitet)
    if (event.organizerEmail) {
        const cn = (event.organizerName || '').replace(/[,;]/g, ' ');
        iCalString += `ORGANIZER;CN=${cn}:mailto:${event.organizerEmail}\n`;
    }

    // ATTENDEES serialisieren (für Einladungen)
    if (event.attendees && event.attendees.length > 0 && event.method === 'REQUEST') {
        event.attendees.forEach((attendee) => {
            if (typeof attendee.email === 'string' && attendee.email.includes('@')) {
                let attendeeString = 'ATTENDEE';
                if (typeof attendee.displayName === 'string' && attendee.displayName) {
                    attendeeString += `;CN=${attendee.displayName.replace(/[,;]/g, ' ')}`;
                }
                attendeeString += `;ROLE=${attendee.role || 'REQ-PARTICIPANT'}`;
                attendeeString += ';PARTSTAT=NEEDS-ACTION';
                attendeeString += ';RSVP=TRUE';
                attendeeString += `:mailto:${attendee.email}\n`;
                iCalString += attendeeString;
            }
        });
    }

    iCalString += `END:VEVENT\nEND:VCALENDAR`;
    return iCalString.replace(/\n/g, CRLF);
}