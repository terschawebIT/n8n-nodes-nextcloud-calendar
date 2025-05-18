import { IDataObject, GenericValue } from 'n8n-workflow';

export interface IAttendee {
    email: string;
    displayName?: string;
    role?: string;
    rsvp?: boolean;
    status?: string;
}

export interface IOrganizer {
    email: string;
    displayName?: string;
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

export interface IEventCreate extends IEventBase {
    calendarName: string;
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
