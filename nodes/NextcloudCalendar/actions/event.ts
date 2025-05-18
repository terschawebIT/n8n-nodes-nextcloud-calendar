import { IExecuteFunctions } from 'n8n-workflow';
import { DAVClient, DAVCalendar } from 'tsdav';
import { IEventCreate, IEventUpdate, IEventResponse } from '../interfaces/event';
import { initClient } from '../helpers/client';
import { findCalendar } from './calendar';
import { parseICalEvent } from '../helpers/parser';
import { formatEvent } from '../helpers/formatter';
import { parseEventResults } from '../helpers/parser';

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

    const event = {
        ...data,
        uid: `n8n-${Date.now()}@caldav`,
    };

    const response = await client.createCalendarObject({
        calendar,
        filename: `${event.uid}.ics`,
        iCalString: generateICalString(event),
    });

    return response;
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

    const response = await client.updateCalendarObject({
        calendarObject: {
            ...events[0],
            data: generateICalString(updatedEvent),
        },
    });

    return response;
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

function generateICalString(event: any) {
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//CalDAV Node//EN
BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
${event.description ? `DESCRIPTION:${event.description}` : ''}
${event.location ? `LOCATION:${event.location}` : ''}
END:VEVENT
END:VCALENDAR`;
}
