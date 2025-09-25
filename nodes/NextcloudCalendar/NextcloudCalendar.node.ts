import {
    IExecuteFunctions,
    ILoadOptionsFunctions,
    INodeExecutionData,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    IDataObject,
    NodeOperationError,
    INodeListSearchResult,
} from 'n8n-workflow';

import { DAVCalendar } from 'tsdav';

// Importe der Aktionen und Hilfsfunktionen
import * as calendarActions from './actions/calendar';
import * as eventActions from './actions/event';
import { parseNextcloudResponse } from './helpers/nextcloud';
import { ICalendarCreate } from './interfaces/calendar';
import { IEventCreate, IEventUpdate } from './interfaces/event';

// Beschreibungen importieren
import {
    resources,
    calendarOperations,
    calendarFields,
    eventOperations,
    eventFields,
} from './descriptions';

export class NextcloudCalendar implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Nextcloud Calendar',
        name: 'nextcloudCalendar',
        icon: 'file:nextcloud-calendar.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Verwalten Sie Ihre Kalender und Termine mit Nextcloud CalDAV',
        defaults: {
            name: 'Nextcloud Calendar',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'nextcloudCalendarApi',
                required: true,
                displayName: 'Nextcloud Calendar API',
            },
        ],
        usableAsTool: true,
        // @ts-expect-error: AIEnabled ist kein Standardfeld, wird aber von n8n AI genutzt
        aiEnabled: true,
        properties: [
            // Ressource: Kalender oder Termin
            resources[0],

            // Kalender-Operationen
            calendarOperations[0],

            // Event-Operationen
            eventOperations[0],

            // Feld-Definitionen
            ...calendarFields,
            ...eventFields,
        ],
    };

    methods = {
        loadOptions: {
            async getCalendars(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    const calendars = await calendarActions.getCalendars(this);
                    if (!calendars || calendars.length === 0) {
                        return [{ name: 'Keine Kalender Gefunden', value: '' }];
                    }
                    return calendars.map((calendar: DAVCalendar) => ({
                        name: (calendar.displayName as string) || 'Unbenannter Kalender',
                        value: (calendar.url as string) || (calendar.displayName as string) || '',
                    }));
                } catch (error) {
                    console.error('Fehler beim Laden der Kalender:', error);
                    return [{ name: 'Fehler Beim Laden Der Kalender', value: '' }];
                }
            },
        },
        listSearch: {
            async getCalendars(
                this: ILoadOptionsFunctions,
                filter?: string,
            ): Promise<INodeListSearchResult> {
                try {
                    const calendars = await calendarActions.getCalendars(this);
                    if (!calendars || calendars.length === 0) {
                        return {
                            results: [{ name: 'Keine Kalender Gefunden', value: '' }],
                        };
                    }
                    let calList = calendars as { displayName: string; url: string }[];
                    if (filter && filter.trim().length > 0) {
                        const normalized = filter.toLowerCase();
                        calList = calList.filter(c => ((c.displayName || '').toLowerCase().includes(normalized)) || ((c.url || '').toLowerCase().includes(normalized)));
                    }
                    return {
                        results: calList.map((calendar) => ({
                            name: calendar.displayName,
                            value: calendar.url || calendar.displayName,
                        })),
                    };
                } catch (error) {
                    console.error('Fehler beim Laden der Kalender:', error);
                    return {
                        results: [{ name: 'Fehler Beim Laden Der Kalender', value: '' }],
                    };
                }
            },
            async getTimeZones(
                this: ILoadOptionsFunctions,
                filter?: string,
            ): Promise<INodeListSearchResult> {
                // Kuratierte Liste gängiger IANA-Zeitzonen für eine benutzerfreundliche Auswahl
                const zones = [
                    'UTC',
                    'Europe/Berlin', 'Europe/Paris', 'Europe/London', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Prague', 'Europe/Vienna',
                    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo',
                    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Kolkata', 'Asia/Dubai',
                    'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
                    'Africa/Johannesburg', 'Africa/Cairo',
                ];
                const q = (filter || '').toLowerCase();
                const filtered = q
                    ? zones.filter(z => z.toLowerCase().includes(q))
                    : zones;
                return {
                    results: filtered.map(z => ({ name: z, value: z })),
                };
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: IDataObject[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        // Hilfsfunktion zum Extrahieren des Kalendernamens aus resourceLocator
        const getCalendarName = (calendarParam: unknown): string => {
            if (typeof calendarParam === 'string') {
                return calendarParam;
            }
            if (
                typeof calendarParam === 'object' &&
                calendarParam !== null &&
                ('value' in calendarParam || 'id' in calendarParam)
            ) {
                const obj = calendarParam as { value?: unknown; id?: unknown };
                const value = typeof obj.value === 'string' ? obj.value : undefined;
                const id = typeof obj.id === 'string' ? obj.id : undefined;
                return value || id || '';
            }
            return '';
        };

        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'calendar') {
                    // Kalenderoperationen
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i) as string;
                        const additionalFields = this.getNodeParameter('calendarSettings', i, {}) as IDataObject;
                        const calendarData: ICalendarCreate = {
                            displayName: name,
                            ...additionalFields,
                        };
                        const response = await calendarActions.createCalendar(this, calendarData);
                        returnData.push({
                            success: true,
                            operation: 'create',
                            resource: 'calendar',
                            message: 'Kalender erfolgreich erstellt',
                            data: response
                        });
                    } else if (operation === 'delete') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const response = await calendarActions.deleteCalendar(this, calendarName);
                        returnData.push({
                            success: true,
                            operation: 'delete',
                            resource: 'calendar',
                            message: 'Kalender erfolgreich gelöscht',
                            data: response
                        });
                    } else if (operation === 'getAll') {
                        const response = await calendarActions.getCalendars(this);
                        returnData.push({
                            success: true,
                            operation: 'getAll',
                            resource: 'calendar',
                            message: 'Kalender erfolgreich abgerufen',
                            data: { calendars: response }
                        });
                    }
                } else if (resource === 'event') {
                    if (operation === 'create') {
                        // Pflichtfelder abrufen
                        const title = this.getNodeParameter('title', i) as string;
                        const start = this.getNodeParameter('start', i) as string;
                        const end = this.getNodeParameter('end', i) as string;
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));

                        // Validiere Start- und Endzeit
                        if (new Date(end) <= new Date(start)) {
                            throw new NodeOperationError(this.getNode(), 'Endzeit muss nach der Startzeit liegen', {
                                itemIndex: i,
                            });
                        }

                        // Event-Daten zusammenstellen
                        const eventData: IEventCreate = {
                            title,
                            start,
                            end,
                            calendarName,
                            description: this.getNodeParameter('description', i, '') as string,
                            location: this.getNodeParameter('location', i, '') as string,
                        };

                        // Teilnehmer immer verarbeiten, wenn vorhanden
                        const attendees = this.getNodeParameter('attendees', i, {}) as IDataObject;
                        if (attendees && attendees.attendeeFields) {
                            const attendeeFields = (attendees.attendeeFields as IDataObject[]);
                            if (Array.isArray(attendeeFields) && attendeeFields.length > 0) {
                                eventData.attendees = attendeeFields.map(attendee => {
                                    // E-Mail-Validierung
                                    if (!attendee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email as string)) {
                                        throw new NodeOperationError(this.getNode(), `Ungültige E-Mail-Adresse: ${attendee.email}`, {
                                            itemIndex: i,
                                        });
                                    }
                                    return {
                                        email: attendee.email as string,
                                        displayName: attendee.displayName as string,
                                        role: attendee.role as 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR',
                                        rsvp: attendee.rsvp as boolean,
                                    };
                                });
                            }
                        }

                        // Einladungen aktivieren, wenn das Flag gesetzt ist
                        const sendInvitations = this.getNodeParameter('sendInvitations', i, false) as boolean;
                        if (sendInvitations) {
                            (eventData as { sendInvitations?: boolean }).sendInvitations = true;
                        }

                        const response = await eventActions.createEvent(this, eventData);
                        if (!response) {
                            throw new NodeOperationError(this.getNode(), 'Termin konnte nicht erstellt werden - keine Antwort vom Server', {
                                itemIndex: i,
                            });
                        }

                        // Verbesserte Antwort mit Status und Details
                        returnData.push({
                            success: true,
                            operation: 'create',
                            resource: 'event',
                            message: 'Termin erfolgreich erstellt',
                            data: response
                        });
                    } else if (operation === 'delete') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const eventId = this.getNodeParameter('eventId', i) as string;
                        const response = await eventActions.deleteEvent(this, calendarName, eventId);
                        if (!response || !response.success) {
                            throw new NodeOperationError(this.getNode(), 'Termin konnte nicht gelöscht werden', {
                                itemIndex: i,
                            });
                        }
                        returnData.push({
                            success: true,
                            operation: 'delete',
                            resource: 'event',
                            message: 'Termin erfolgreich gelöscht',
                            data: response
                        });
                    } else if (operation === 'get') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const eventId = this.getNodeParameter('eventId', i) as string;
                        const response = await eventActions.getEvent(this, calendarName, eventId);
                        if (!response) {
                            throw new NodeOperationError(this.getNode(), 'Termin konnte nicht gefunden werden', {
                                itemIndex: i,
                            });
                        }
                        returnData.push({
                            success: true,
                            operation: 'get',
                            resource: 'event',
                            message: 'Termin erfolgreich abgerufen',
                            data: parseNextcloudResponse(response)
                        });
                    } else if (operation === 'getAll') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const start = this.getNodeParameter('start', i) as string;
                        const end = this.getNodeParameter('end', i) as string;
                        const response = await eventActions.getEvents(this, calendarName, start, end);
                        if (!response || !Array.isArray(response)) {
                            throw new NodeOperationError(this.getNode(), 'Keine Termine gefunden oder ungültige Antwort vom Server', {
                                itemIndex: i,
                            });
                        }
                        const parsedEvents = response.map(event => parseNextcloudResponse(event));
                        returnData.push({
                            success: true,
                            operation: 'getAll',
                            resource: 'event',
                            message: 'Termine erfolgreich abgerufen',
                            data: { events: parsedEvents }
                        });
                    } else if (operation === 'update') {
                        const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const eventId = this.getNodeParameter('eventId', i) as string;

                        // Validiere Start- und Endzeit, wenn beide angegeben sind
                        if (updateFields.start && updateFields.end) {
                            if (new Date(updateFields.end as string) <= new Date(updateFields.start as string)) {
                                throw new NodeOperationError(this.getNode(), 'Endzeit muss nach der Startzeit liegen', {
                                    itemIndex: i,
                                });
                            }
                        }

                        const updateData: IEventUpdate = {
                            calendarName,
                            eventId,
                            title: updateFields.title as string,
                            start: updateFields.start as string,
                            end: updateFields.end as string,
                            description: updateFields.description as string | undefined,
                            location: updateFields.location as string | undefined,
                        };

                        // Teilnehmer immer verarbeiten, wenn vorhanden
                        const attendees = this.getNodeParameter('attendees', i, {}) as IDataObject;
                        if (attendees && attendees.attendeeFields) {
                            const attendeeFields = (attendees.attendeeFields as IDataObject[]);
                            if (Array.isArray(attendeeFields) && attendeeFields.length > 0) {
                                updateData.attendees = attendeeFields.map(attendee => {
                                    // E-Mail-Validierung
                                    if (!attendee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email as string)) {
                                        throw new NodeOperationError(this.getNode(), `Ungültige E-Mail-Adresse: ${attendee.email}`, {
                                            itemIndex: i,
                                        });
                                    }
                                    return {
                                        email: attendee.email as string,
                                        displayName: attendee.displayName as string,
                                        role: attendee.role as 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'CHAIR',
                                        rsvp: attendee.rsvp as boolean,
                                    };
                                });
                            }
                        }

                        // Einladungen aktivieren, wenn das Flag gesetzt ist
                        const sendInvitations = this.getNodeParameter('sendInvitations', i, false) as boolean;
                        if (sendInvitations) {
                            (updateData as { sendInvitations?: boolean }).sendInvitations = true;
                        }

                        const response = await eventActions.updateEvent(this, updateData);
                        if (!response) {
                            throw new NodeOperationError(this.getNode(), 'Termin konnte nicht aktualisiert werden', {
                                itemIndex: i,
                            });
                        }
                        returnData.push({
                            success: true,
                            operation: 'update',
                            resource: 'event',
                            message: 'Termin erfolgreich aktualisiert',
                            data: parseNextcloudResponse(response)
                        });
                    } else if (operation === 'nextEvents') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        // Zeitraumparameter aus UI hinzufügen
                        const maxEvents = this.getNodeParameter('maxEvents', i, 10) as number;
                        const now = new Date();
                        const end = new Date();
                        end.setMonth(end.getMonth() + 1); // Standardmäßig einen Monat in die Zukunft

                        console.log(`Suche Termine in Kalender "${calendarName}" von ${now.toISOString()} bis ${end.toISOString()}`);

                        const response = await eventActions.getEvents(
                            this,
                            calendarName,
                            now.toISOString(),
                            end.toISOString(),
                        );

                        if (!response) {
                            console.log('Keine Antwort vom Server erhalten');
                            throw new NodeOperationError(this.getNode(), 'Keine Antwort vom Server', {
                                itemIndex: i,
                            });
                        }

                        console.log(`Anzahl gefundener Termine: ${Array.isArray(response) ? response.length : 0}`);

                        if (!Array.isArray(response) || response.length === 0) {
                            // Auch bei leerer Liste ein Ergebnis zurückgeben
                            returnData.push({
                                success: true,
                                operation: 'nextEvents',
                                resource: 'event',
                                message: 'Keine Termine im angegebenen Zeitraum gefunden',
                                data: {
                                    events: [],
                                    message: 'Keine Termine im angegebenen Zeitraum gefunden'
                                }
                            });
                        } else {
                            // Termine zurückgeben und auf maxEvents beschränken
                            const parsedEvents = response
                                .slice(0, maxEvents)
                                .map(event => {
                                    const parsed = parseNextcloudResponse(event);
                                    console.log(`Verarbeite Termin: ${JSON.stringify(parsed)}`);
                                    return parsed;
                                });

                            returnData.push({
                                success: true,
                                operation: 'nextEvents',
                                resource: 'event',
                                message: 'Termine erfolgreich abgerufen',
                                data: {
                                    events: parsedEvents,
                                    count: parsedEvents.length,
                                    totalCount: response.length
                                }
                            });
                        }
                    } else if (operation === 'search') {
                        const calendarName = getCalendarName(this.getNodeParameter('calendarName', i));
                        const searchTerm = this.getNodeParameter('searchTerm', i) as string;
                        const start = this.getNodeParameter('start', i) as string;
                        const end = this.getNodeParameter('end', i) as string;
                        const searchOptions = this.getNodeParameter('searchOptions', i, {}) as IDataObject;

                        console.log(`Suche nach Terminen in Kalender "${calendarName}" mit Suchbegriff "${searchTerm}" im Zeitraum ${start} bis ${end}`);

                        // Zunächst alle Termine im Zeitraum abrufen
                        const events = await eventActions.getEvents(this, calendarName, start, end);

                        if (!events || !Array.isArray(events)) {
                            throw new NodeOperationError(this.getNode(), 'Keine Termine gefunden oder ungültige Antwort vom Server', {
                                itemIndex: i,
                            });
                        }

                        console.log(`${events.length} Termine im angegebenen Zeitraum gefunden, filtere nach Suchbegriff`);

                        // Filtere die Ergebnisse basierend auf den Suchoptionen
                        const filteredEvents = events.filter(event => {
                            // Bereite den Suchbegriff und die zu durchsuchenden Felder vor
                            const caseSensitive = !!searchOptions.caseSensitive;
                            const exactMatch = !!searchOptions.exactMatch;
                            const titlesOnly = !!searchOptions.titlesOnly;

                            let termToSearch = searchTerm;
                            if (!caseSensitive) {
                                termToSearch = termToSearch.toLowerCase();
                            }

                            // Prüfe den Titel
                            let titleMatch = false;
                            if (event.title) {
                                let title = event.title;
                                if (!caseSensitive) {
                                    title = title.toLowerCase();
                                }

                                if (exactMatch) {
                                    titleMatch = title === termToSearch;
                                } else {
                                    titleMatch = title.includes(termToSearch);
                                }
                            }

                            // Wenn nur in Titeln gesucht werden soll oder bereits ein Treffer gefunden wurde
                            if (titlesOnly || titleMatch) {
                                return titleMatch;
                            }

                            // Prüfe Beschreibung und Ort
                            let descriptionMatch = false;
                            let locationMatch = false;

                            if (event.description) {
                                let description = event.description;
                                if (!caseSensitive) {
                                    description = description.toLowerCase();
                                }

                                if (exactMatch) {
                                    descriptionMatch = description === termToSearch;
                                } else {
                                    descriptionMatch = description.includes(termToSearch);
                                }
                            }

                            if (event.location) {
                                let location = event.location;
                                if (!caseSensitive) {
                                    location = location.toLowerCase();
                                }

                                if (exactMatch) {
                                    locationMatch = location === termToSearch;
                                } else {
                                    locationMatch = location.includes(termToSearch);
                                }
                            }

                            return titleMatch || descriptionMatch || locationMatch;
                        });

                        console.log(`${filteredEvents.length} Termine gefunden, die dem Suchbegriff entsprechen`);

                        if (filteredEvents.length === 0) {
                            returnData.push({
                                success: true,
                                operation: 'search',
                                resource: 'event',
                                message: 'Keine Termine mit dem Suchbegriff gefunden',
                                data: {
                                    events: [],
                                    searchTerm,
                                    count: 0,
                                    totalCount: events.length
                                }
                            });
                        } else {
                            const parsedEvents = filteredEvents.map(event => parseNextcloudResponse(event));

                            returnData.push({
                                success: true,
                                operation: 'search',
                                resource: 'event',
                                message: `${filteredEvents.length} Termine gefunden`,
                                data: {
                                    events: parsedEvents,
                                    searchTerm,
                                    count: parsedEvents.length,
                                    totalCount: events.length
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        success: false,
                        message: error.message,
                        error: {
                            name: error.name,
                            description: error.description || '',
                            resource,
                            operation,
                            itemIndex: i,
                        }
                    });
                    continue;
                }
                throw error;
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}

