import { IAttendee } from './IAttendee';

export interface IOrganizer {
    email: string;
    displayName: string;
}

export interface IEventBase {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: IAttendee[];
    organizer?: IOrganizer;
}

export interface IEventCreate {
    calendarName: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: IAttendee[];
    room?: string;
    resources?: string[];
    alarmType?: 'EMAIL' | 'DISPLAY';
}

export interface IEventUpdate extends IEventBase {
    calendarName: string;
    eventId: string;
}

export interface IEventResponse extends IEventBase {
    uid: string;
    url: string;
    etag: string;
    created?: Date;
    lastModified?: Date;
    status?: string;
}
