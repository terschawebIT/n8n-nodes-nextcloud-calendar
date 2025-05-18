import { v4 as uuidv4 } from 'uuid';
import { IAttendee } from '../interfaces/IAttendee';

interface IEventData {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    attendees?: IAttendee[];
    organizer?: {
        email: string;
        displayName: string;
    };
}

export function formatEvent(eventData: IEventData): string {
    const uid = uuidv4();
    const now = new Date().toISOString().replace(/[-:.]/g, '');

    let iCalString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//CalDAV Node Nextcloud//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now.substring(0, 15)}Z
DTSTART:${eventData.start.replace(/[-:.]/g, '')}
DTEND:${eventData.end.replace(/[-:.]/g, '')}
SUMMARY:${eventData.title}
SEQUENCE:0
STATUS:CONFIRMED\n`;

    if (eventData.description) {
        iCalString += `DESCRIPTION:${eventData.description.replace(/\\n/g, '\\n')}\n`;
    }

    if (eventData.location) {
        iCalString += `LOCATION:${eventData.location}\n`;
    }

    // Nextcloud-spezifische Eigenschaften
    iCalString += 'CLASS:PUBLIC\n';
    iCalString += `X-NC-GROUP-ID:${uid}\n`;

    if (eventData.organizer) {
        iCalString += `ORGANIZER;CN=${eventData.organizer.displayName}:mailto:${eventData.organizer.email}\n`;
    }

    if (eventData.attendees && eventData.attendees.length > 0) {
        eventData.attendees.forEach((attendee) => {
            let attendeeString = 'ATTENDEE;CUTYPE=INDIVIDUAL';
            if (attendee.displayName) {
                attendeeString += `;CN=${attendee.displayName}`;
            }
            if (attendee.role) {
                attendeeString += `;ROLE=${attendee.role}`;
            }
            if (attendee.rsvp) {
                attendeeString += ';RSVP=TRUE';
            }
            attendeeString += `:mailto:${attendee.email}\n`;
            iCalString += attendeeString;
        });
    }

    iCalString += `END:VEVENT
END:VCALENDAR`;

    return iCalString;
}
