import { IDataObject } from 'n8n-workflow';

export interface ICalendarBase {
    displayName: string;
    color?: string;
    timezone?: string;
    description?: string;
}

export interface ICalendarCreate {
    name: string;
    displayName: string;
    color?: string;
    description?: string;
}

export interface ICalendarUpdate extends ICalendarBase {
    // Zusätzliche Felder für die Kalenderaktualisierung
}

export interface ICalendarResponse extends ICalendarCreate {
    url: string;
    ctag: string;
    syncToken: string;
    resourcetype: string[];
    owner?: string;
    principalURL?: string;
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

export interface IEventResponse {
    id: string;
    calendarName: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: IAttendee[];
    room?: string;
    resources?: string[];
    url: string;
    etag?: string;
    groupId?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
}

export interface IAttendee {
    email: string;
    displayName?: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR';
    rsvp?: boolean;
    status?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}
