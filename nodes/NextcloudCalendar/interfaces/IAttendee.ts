export interface IAttendee {
    email: string;
    displayName?: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT' | 'CHAIR';
    rsvp?: boolean;
} 