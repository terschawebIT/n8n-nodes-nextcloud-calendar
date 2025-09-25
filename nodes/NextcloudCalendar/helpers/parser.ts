import { DAVCalendarObject, DAVResponse } from 'tsdav';
import { IEventResponse } from '../interfaces/event';
import { IAttendee } from '../interfaces/IAttendee';

type CalendarObjectType = DAVCalendarObject | DAVResponse;

interface ICalParams {
    [key: string]: string;
}

interface DAVCalendarResponseProps {
    'calendar-data'?: {
        _text?: string;
    };
    getetag?: {
        _text?: string;
    };
}

interface DAVCalendarResponseExt extends DAVResponse {
    href?: string;
    props?: DAVCalendarResponseProps;
}

function parseICalDate(date: string): Date {
    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDD
    const year = parseInt(date.substr(0, 4));
    const month = parseInt(date.substr(4, 2)) - 1;
    const day = parseInt(date.substr(6, 2));

    if (date.includes('T')) {
        const hour = parseInt(date.substr(9, 2));
        const minute = parseInt(date.substr(11, 2));
        const second = parseInt(date.substr(13, 2));
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    return new Date(Date.UTC(year, month, day));
}

interface IParsedEvent {
    uid?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: Date;
    end?: Date;
    tzidStart?: string;
    tzidEnd?: string;
    created?: Date;
    lastmodified?: Date;
    status?: string;
    dtstamp?: Date;
    sequence?: number;
    transparency?: 'OPAQUE' | 'TRANSPARENT' | string;
    categories?: string[];
    class?: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL' | string;
    rrule?: string;
    recurrenceId?: string;
    exdate?: string[];
    rdate?: string[];
    priority?: number;
    duration?: string;
    geo?: { latitude: number; longitude: number };
    attendee?: Array<{ val: string; params: ICalParams }>;
    organizer?: { val: string; params: ICalParams };
    raw?: Record<string, string | string[]>;
}

function parseICS(icsData: string): { vevent: IParsedEvent } {
    const lines = icsData.split('\n').map(line => line.replace(/\r$/, ''));
    const event: IParsedEvent = {};
    let inEvent = false;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();

        if (rawLine === 'BEGIN:VEVENT') {
            inEvent = true;
            continue;
        }
        if (rawLine === 'END:VEVENT') {
            break;
        }
        if (!inEvent || rawLine.length === 0) {
            continue;
        }

        const colonIdx = rawLine.indexOf(':');
        if (colonIdx === -1) continue;
        const keyWithParams = rawLine.slice(0, colonIdx);
        const value = rawLine.slice(colonIdx + 1);
        const [key, ...paramParts] = keyWithParams.split(';'); // e.g. DTSTART;TZID=... -> DTSTART
        const params: ICalParams = {};
        for (const part of paramParts) {
            const idx = part.indexOf('=');
            if (idx > -1) {
                const pKey = part.slice(0, idx);
                const pVal = part.slice(idx + 1);
                params[pKey] = pVal;
            }
        }

        switch (key) {
            case 'UID':
                event.uid = value;
                break;
            case 'SUMMARY':
                event.summary = value;
                break;
            case 'DESCRIPTION':
                event.description = value;
                break;
            case 'LOCATION':
                event.location = value;
                break;
            case 'DTSTART':
                event.start = parseICalDate(value);
                if (params.TZID) event.tzidStart = params.TZID;
                break;
            case 'DTEND':
                event.end = parseICalDate(value);
                if (params.TZID) event.tzidEnd = params.TZID;
                break;
            case 'CREATED':
                event.created = parseICalDate(value);
                break;
            case 'LAST-MODIFIED':
                event.lastmodified = parseICalDate(value);
                break;
            case 'STATUS':
                event.status = value;
                break;
            case 'DTSTAMP':
                event.dtstamp = parseICalDate(value);
                break;
            case 'SEQUENCE':
                event.sequence = Number(value);
                break;
            case 'TRANSP':
                event.transparency = value as IParsedEvent['transparency'];
                break;
            case 'CATEGORIES':
                event.categories = value.split(',').map(v => v.trim()).filter(Boolean);
                break;
            case 'CLASS':
                event.class = value as IParsedEvent['class'];
                break;
            case 'RRULE':
                event.rrule = value;
                break;
            case 'RECURRENCE-ID':
                event.recurrenceId = value;
                break;
            case 'EXDATE':
                (event.exdate ||= []).push(value);
                break;
            case 'RDATE':
                (event.rdate ||= []).push(value);
                break;
            case 'PRIORITY':
                event.priority = Number(value);
                break;
            case 'DURATION':
                event.duration = value;
                break;
            case 'GEO': {
                const parts = value.split(';');
                if (parts.length === 2) {
                    const lat = Number(parts[0]);
                    const lon = Number(parts[1]);
                    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                        event.geo = { latitude: lat, longitude: lon };
                    }
                }
                break;
            }
            case 'ATTENDEE': {
                if (!event.attendee) {
                    event.attendee = [];
                }
                const [paramsStr, email] = value.split('mailto:');
                const attendee = {
                    val: `mailto:${email}`,
                    params: {} as ICalParams
                };
                if (paramsStr) {
                    paramsStr.split(';').forEach((param: string) => {
                        const [paramKey, paramValue] = param.split('=');
                        if (paramKey && paramValue) {
                            attendee.params[paramKey] = paramValue;
                        }
                    });
                }
                event.attendee.push(attendee);
                break;
            }
            case 'ORGANIZER': {
                const [orgParams, orgEmail] = value.split('mailto:');
                event.organizer = {
                    val: `mailto:${orgEmail}`,
                    params: {} as ICalParams
                };
                if (orgParams) {
                    if (event.organizer && event.organizer.params) {
                        orgParams.split(';').forEach((param: string) => {
                            const [paramKey, paramValue] = param.split('=');
                            if (paramKey && paramValue && event.organizer) {
                                event.organizer.params[paramKey] = paramValue;
                            }
                        });
                    }
                }
                break;
            }
            default: {
                // Sammle unbekannte/rohe Properties innerhalb VEVENT
                if (!event.raw) event.raw = {};
                if (event.raw[key]) {
                    const existing = event.raw[key];
                    if (Array.isArray(existing)) {
                        existing.push(value);
                    } else {
                        event.raw[key] = [existing as string, value];
                    }
                } else {
                    event.raw[key] = value;
                }
                break;
            }
        }
    }

    return { vevent: event };
}

export function parseEventResults(events: CalendarObjectType[]): IEventResponse[] {
    const eventResults: IEventResponse[] = [];

    for (const event of events) {
        const eventData = 'data' in event
            ? event.data
            : (event as DAVCalendarResponseExt).props?.['calendar-data']?._text;
        if (!eventData) {
            continue;
        }

        const parsedData = parseICS(eventData);
        const eventInfo = parsedData.vevent;

        // Parse attendees from iCal format
        const attendees: IAttendee[] = [];
        if (eventInfo.attendee) {
            const attendeeList: Array<{ val: string; params: ICalParams }> = Array.isArray(eventInfo.attendee)
                ? eventInfo.attendee
                : eventInfo.attendee
                ? [eventInfo.attendee]
                : [];
            for (const attendee of attendeeList) {
                const email = attendee?.val?.replace('mailto:', '') ?? '';
                const params = attendee?.params || {};
                attendees.push({
                    email,
                    displayName: params.CN,
                    role: (params.ROLE as IAttendee['role']) || 'REQ-PARTICIPANT',
                    rsvp: params.RSVP === 'TRUE',
                    status: (params.PARTSTAT as IAttendee['status']) || 'NEEDS-ACTION',
                });
            }
        }

        // Parse organizer
        let organizer: { email: string; displayName?: string } = { email: '', displayName: '' };
        if (eventInfo.organizer && eventInfo.organizer.val) {
            organizer = {
                email: eventInfo.organizer.val.replace('mailto:', ''),
                displayName: eventInfo.organizer.params?.CN ?? '',
            };
        }

        const url = 'url' in event
            ? event.url
            : (event as DAVCalendarResponseExt).href ?? '';
        const etag = 'etag' in event
            ? event.etag
            : (event as DAVCalendarResponseExt).props?.getetag?._text ?? '';

        eventResults.push({
            url: url || '',
            etag: etag || '',
            uid: eventInfo.uid ?? '',
            title: eventInfo.summary ?? '',
            start: eventInfo.start?.toISOString(),
            end: eventInfo.end?.toISOString(),
            tzidStart: eventInfo.tzidStart,
            tzidEnd: eventInfo.tzidEnd,
            dtstamp: eventInfo.dtstamp?.toISOString(),
            description: eventInfo.description ?? '',
            location: eventInfo.location ?? '',
            created: eventInfo.created,
            lastModified: eventInfo.lastmodified,
            status: eventInfo.status as IEventResponse['status'],
            sequence: eventInfo.sequence,
            transparency: eventInfo.transparency,
            categories: eventInfo.categories,
            class: eventInfo.class,
            rrule: eventInfo.rrule,
            recurrenceId: eventInfo.recurrenceId,
            exdate: eventInfo.exdate,
            rdate: eventInfo.rdate,
            priority: eventInfo.priority,
            duration: eventInfo.duration,
            geo: eventInfo.geo,
            attendees,
            organizer,
            rawProperties: eventInfo.raw,
        });
    }

    return eventResults.sort((a, b) => {
        const startA = a?.start ?? '';
        const startB = b?.start ?? '';

        if (startA < startB) {
            return -1;
        } else if (startA > startB) {
            return 1;
        } else {
            return 0;
        }
    });
}

export function parseICalEvent(calendarObject: DAVCalendarObject): IEventResponse {
    const icalData = parseICS(calendarObject.data);
    const event = icalData.vevent;

    // Vollständigere Antwort zurückgeben
    const response: IEventResponse = {
        uid: event.uid ?? '',
        title: event.summary ?? '',
        start: event.start?.toISOString(),
        end: event.end?.toISOString(),
        description: event.description ?? '',
        location: event.location ?? '',
        url: calendarObject.url ?? '',
        etag: calendarObject.etag ?? '',
        created: event.created,
        lastModified: event.lastmodified,
        status: event.status,
        // Vollständige Informationen über Organisator zurückgeben
        organizer: event.organizer ? {
            email: event.organizer.val.replace('mailto:', ''),
            displayName: event.organizer.params?.CN,
        } : undefined,
        // Vollständige Informationen über Teilnehmer zurückgeben
        attendees: !event.attendee
            ? undefined
            : Array.isArray(event.attendee)
                ? event.attendee.map((a: { val: string; params: ICalParams }) => ({
                    email: a.val.replace('mailto:', ''),
                    displayName: a.params?.CN,
                    role: (a.params?.ROLE as IAttendee['role']) ?? 'REQ-PARTICIPANT',
                    status: (a.params?.PARTSTAT as IAttendee['status']) ?? 'NEEDS-ACTION',
                    rsvp: a.params?.RSVP === 'TRUE',
                  }))
                : [{
                    email: (event.attendee as { val: string; params: ICalParams }).val.replace('mailto:', ''),
                    displayName: (event.attendee as { val: string; params: ICalParams }).params?.CN,
                    role: ((event.attendee as { val: string; params: ICalParams }).params?.ROLE as IAttendee['role']) ?? 'REQ-PARTICIPANT',
                    status: ((event.attendee as { val: string; params: ICalParams }).params?.PARTSTAT as IAttendee['status']) ?? 'NEEDS-ACTION',
                    rsvp: (event.attendee as { val: string; params: ICalParams }).params?.RSVP === 'TRUE',
                  }],
    };

    return response;
}
