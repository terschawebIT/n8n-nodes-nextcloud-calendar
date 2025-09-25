import { IExecuteFunctions } from 'n8n-workflow';
import { initClient } from '../helpers/client';
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

    const event = {
        ...data,
        uid: `n8n-${Date.now()}@nextcloud-calendar`,
        credentials: credentials,
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
        },
    });

    console.log(`Response von createCalendarObject:`, response);

    // Prüfe, ob der Termin tatsächlich erstellt wurde
    try {
        const createdEvent = await getEvent(context, data.calendarName, event.uid);
        console.log(`Termin erfolgreich erstellt und gefunden:`, createdEvent);
    } catch (error) {
        console.log(`Warnung: Erstellter Termin konnte nicht gefunden werden:`, error.message);
    }

    // Verbesserte Rückgabe als eigenes Objekt
    const result = {
        success: true,
        message: 'Termin erfolgreich erstellt',
        uid: event.uid,
        details: {
            title: event.title,
            start: event.start,
            end: event.end,
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

    const response = await client.updateCalendarObject({
        calendarObject: {
            ...events[0],
            data: generateICalString(updatedEvent),
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

    // Temporär: ORGANIZER komplett deaktiviert für Debugging
    console.log(`ORGANIZER wird temporär NICHT gesetzt (Debugging)`);
    // const credentials = event.credentials || {};
    // const username = typeof credentials.username === 'string' ? credentials.username : 'n8n';
    // let organizerEmail = `${username}@localhost`;
    // if (typeof credentials.email === 'string' && credentials.email.includes('@')) {
    //     organizerEmail = credentials.email;
    // }
    // console.log(`ORGANIZER wird gesetzt: CN=${username}, Email=${organizerEmail}`);
    // iCalString += `ORGANIZER;CN=${username}:mailto:${organizerEmail}\n`;

    // ATTENDEES temporär deaktiviert für Debugging
    if (event.attendees && event.attendees.length > 0) {
        console.log(`WARNUNG: ${event.attendees.length} Teilnehmer werden temporär ignoriert (Debugging)`);
        // Kommentiert aus für Debugging:
        // event.attendees.forEach((attendee) => {
        //     if (typeof attendee.email === 'string' && attendee.email.includes('@')) {
        //         let attendeeString = 'ATTENDEE';
        //         if (typeof attendee.displayName === 'string') {
        //             attendeeString += `;CN=${attendee.displayName}`;
        //         }
        //         attendeeString += `;ROLE=${attendee.role || 'REQ-PARTICIPANT'}`;
        //         attendeeString += ';PARTSTAT=NEEDS-ACTION';
        //         attendeeString += `:mailto:${attendee.email}\n`;
        //         iCalString += attendeeString;
        //     }
        // });
    }

    iCalString += `END:VEVENT\nEND:VCALENDAR`;
    return iCalString.replace(/\n/g, CRLF);
}