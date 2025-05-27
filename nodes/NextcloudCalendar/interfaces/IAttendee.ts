export interface IAttendee {
    email: string;
    displayName?: string;
    rsvp?: boolean;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR';
    status?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}
