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
    description?: string;
    location?: string;
    created?: Date;
    lastModified?: Date;
    status?: string;
    sequence?: number;
    organizer?: {
        email: string;
        displayName?: string;
    };
    attendees?: IAttendee[];
}
