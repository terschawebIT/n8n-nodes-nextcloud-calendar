import {
    IExecuteFunctions,
    ILoadOptionsFunctions,
} from 'n8n-workflow';

import { DAVCalendar, DAVClient } from 'tsdav';
import { initClient } from '../helpers/client';
import { ICalendarCreate } from '../interfaces/calendar';

export async function findCalendar(
    context: IExecuteFunctions,
    client: DAVClient,
    calendarName: string,
): Promise<DAVCalendar> {
    const calendars = await getCalendars(context);
    // 1) Exakte Übereinstimmung nach displayName
    let calendar = calendars.find((cal: DAVCalendar) => cal.displayName === calendarName);
    // 2) Falls kein Treffer: nach URL/HREF suchen (wenn Nutzer die ID/URL angegeben hat)
    if (!calendar) {
        calendar = calendars.find((cal: DAVCalendar) => cal.url === calendarName);
    }
    // 3) Falls weiterhin kein Treffer: Nach Endung des URL-Pfads matchen (z. B. .../niko/)
    if (!calendar) {
        calendar = calendars.find((cal: DAVCalendar) => {
            const suffix = `/${calendarName.replace(/\/?$/, '/')}`;
            return typeof cal.url === 'string' && cal.url.endsWith(suffix);
        });
    }
    if (!calendar) {
        throw new Error(`Calendar "${calendarName}" not found`);
    }
    return calendar;
}

export async function getCalendars(
    context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<DAVCalendar[]> {
    const client = await initClient(context);
    const calendars = await client.fetchCalendars();
    return calendars;
}

export async function createCalendar(
    context: IExecuteFunctions,
    data: ICalendarCreate,
): Promise<DAVCalendar> {
    const client = await initClient(context);
    const calendars = await client.fetchCalendars();
    const homeUrl = calendars[0]?.url?.split('/').slice(0, -1).join('/') || '';

    await client.createCalendarObject({
        calendar: {
            url: `${homeUrl}/${data.displayName}/`,
            displayName: data.displayName,
        },
        filename: 'calendar.ics',
        iCalString: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//Nextcloud Calendar Node//EN
NAME:${data.displayName}
X-WR-TIMEZONE:${data.timezone || 'UTC'}
END:VCALENDAR`,
    });

    const newCalendar = {
        url: `${homeUrl}/${data.displayName}/`,
        displayName: data.displayName,
        timezone: data.timezone,
        color: data.color,
        description: data.description,
    };

    return newCalendar as DAVCalendar;
}

export async function deleteCalendar(
    context: IExecuteFunctions,
    calendarName: string,
): Promise<{ success: boolean }> {
    const client = await initClient(context);
    const calendar = await findCalendar(context, client, calendarName);

    await client.deleteCalendarObject({
        calendarObject: {
            url: calendar.url,
            data: '',
            etag: '',
        },
    });

    return { success: true };
}
