import { IAttendee } from './IAttendee';
import { IDataObject } from 'n8n-workflow';

export interface IEventBase {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: IAttendee[];
    timeZone?: string;
}

export interface IEventCreate extends IEventBase {
    calendarName: string;
}

export interface IEventUpdate extends Partial<IEventBase> {
    calendarName: string;
    eventId: string;
}

export interface IEventResponse extends IDataObject {
    uid: string;
    url?: string;
    etag?: string;
    title?: string;
    start?: string;
    end?: string;
    tzidStart?: string;
    tzidEnd?: string;
    dtstamp?: string;
    description?: string;
    location?: string;
    created?: Date;
    lastModified?: Date;
    status?: string;
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
    organizer?: {
        email: string;
        displayName?: string;
    };
    attendees?: IAttendee[];
    rawProperties?: Record<string, string | string[]>;
}
