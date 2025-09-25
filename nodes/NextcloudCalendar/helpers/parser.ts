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
    created?: Date;
    lastmodified?: Date;
    status?: string;
    attendee?: Array<{ val: string; params: ICalParams }>;
    organizer?: { val: string; params: ICalParams };
}

function parseICS(icsData: string): { vevent: IParsedEvent } {
    const lines = icsData.split('\n').map(line => line.trim());
    const event: IParsedEvent = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('BEGIN:VEVENT')) {
            continue;
        }
        if (line.startsWith('END:VEVENT')) {
            break;
        }

        const [key, ...values] = line.split(':');
        const value = values.join(':');

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
                break;
            case 'DTEND':
                event.end = parseICalDate(value);
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
            case 'ATTENDEE':
                if (!event.attendee) {
                    event.attendee = [];
                }
                const [params, email] = value.split('mailto:');
                const attendee = {
                    val: `mailto:${email}`,
                    params: {} as ICalParams
                };
                if (params) {
                    params.split(';').forEach((param: string) => {
                        const [paramKey, paramValue] = param.split('=');
                        if (paramKey && paramValue) {
                            attendee.params[paramKey] = paramValue;
                        }
                    });
                }
                event.attendee.push(attendee);
                break;
            case 'ORGANIZER':
                const [orgParams, orgEmail] = value.split('mailto:');
                event.organizer = {
                    val: `mailto:${orgEmail}`,
                    params: {} as ICalParams
                };
                if (orgParams) {
                    if (event.organizer && event.organizer.params) {
                        orgParams.split(';').forEach((param: string) => {
                            const [paramKey, paramValue] = param.split('=');
                            if (paramKey && paramValue) {
                                if (event.organizer) {
                                    event.organizer.params[paramKey] = paramValue;
                                }
                            }
                        });
                    }
                }
                break;
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
            description: eventInfo.description ?? '',
            location: eventInfo.location ?? '',
            created: eventInfo.created,
            lastModified: eventInfo.lastmodified,
            status: eventInfo.status as IEventResponse['status'],
            attendees,
            organizer,
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
