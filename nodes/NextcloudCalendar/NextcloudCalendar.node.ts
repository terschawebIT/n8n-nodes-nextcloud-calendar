/* eslint-disable n8n-nodes-base/node-class-description-credentials-name-unsuffixed */

import {
    IExecuteFunctions,
    ILoadOptionsFunctions,
    INodeExecutionData,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    IDataObject,
} from 'n8n-workflow';

import { calendarOperations, calendarFields } from './descriptions/calendar';
import { eventOperations, eventFields } from './descriptions/event';

import * as calendarActions from './actions/calendar';
import * as eventActions from './actions/event';
import { parseNextcloudResponse } from './helpers/nextcloud';
import { ICalendarCreate } from './interfaces/calendar';
import { IEventCreate, IEventUpdate } from './interfaces/event';

export class NextcloudCalendar implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Nextcloud Kalender',
        name: 'nextcloudCalendar',
        icon: 'file:nextcloud.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Verwalten Sie Ihre Nextcloud-Kalender und Termine',
        defaults: {
            name: 'Nextcloud Kalender',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'nextcloudCalendarAuth',
                required: true,
                displayName: 'Nextcloud Zugangsdaten',
            },
        ],
        properties: [
            {
                displayName: 'Ressource',
                name: 'resource',
                type: 'options',
                options: [
                    {
                        name: 'Kalender',
                        value: 'calendar',
                        description: 'Kalender erstellen und verwalten'
                    },
                    {
                        name: 'Termin',
                        value: 'event',
                        description: 'Termine planen und organisieren'
                    }
                ],
                default: 'calendar',
                required: true,
            },
            // Nextcloud-spezifische Einstellungen
            {
                displayName: 'Nextcloud Einstellungen',
                name: 'nextcloudSettings',
                type: 'collection',
                placeholder: 'Nextcloud-Einstellungen hinzufügen',
                default: {},
                options: [
                    {
                        displayName: 'Export Ausblenden',
                        name: 'hideEventExport',
                        type: 'boolean',
                        default: false,
                        description: 'Ob die Export-Buttons in der Benutzeroberfläche ausgeblendet werden sollen',
                    },
                    {
                        displayName: 'Einladungen Senden',
                        name: 'sendInvitations',
                        type: 'boolean',
                        default: true,
                        description: 'Ob Einladungen an Teilnehmer gesendet werden sollen',
                    },
                    {
                        displayName: 'Benachrichtigungen Aktivieren',
                        name: 'enableNotifications',
                        type: 'boolean',
                        default: true,
                        description: 'Ob Benachrichtigungen für Termine aktiviert werden sollen',
                    },
                    {
                        displayName: 'Push-Benachrichtigungen Aktivieren',
                        name: 'enablePushNotifications',
                        type: 'boolean',
                        default: true,
                        description: 'Ob Push-Benachrichtigungen für Termine aktiviert werden sollen',
                    },
                    {
                        displayName: 'Erinnerungstyp Erzwingen',
                        name: 'forceEventAlarmType',
                        type: 'options',
                        options: [
                            {
                                name: 'E-Mail',
                                value: 'EMAIL',
                                description: 'Erinnerungen per E-Mail senden',
                            },
                            {
                                name: 'Anzeige',
                                value: 'DISPLAY',
                                description: 'Erinnerungen als System-Benachrichtigungen anzeigen',
                            },
                        ],
                        default: 'DISPLAY',
                        description: 'Welcher Typ von Terminerinnerungen verwendet werden soll',
                    },
                ],
            },
            ...calendarOperations,
            ...calendarFields,
            ...eventOperations,
            ...eventFields,
        ],
    };

    methods = {
        loadOptions: {
            async getCalendars(
                this: ILoadOptionsFunctions,
            ): Promise<INodePropertyOptions[]> {
                const calendars = await calendarActions.getCalendars(this);
                return calendars.map((calendar: { displayName: string }) => ({
                    name: calendar.displayName,
                    value: calendar.displayName,
                }));
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'calendar') {
                    // Kalenderoperationen
                    if (operation === 'create') {
                        const calendarData = this.getNodeParameter('calendarFields', i) as ICalendarCreate;
                        const response = await calendarActions.createCalendar(this, calendarData);
                        returnData.push({ json: response });
                    } else if (operation === 'delete') {
                        const calendarName = this.getNodeParameter('name', i) as string;
                        const response = await calendarActions.deleteCalendar(this, calendarName);
                        returnData.push({ json: response });
                    } else if (operation === 'getAll') {
                        const response = await calendarActions.getCalendars(this);
                        returnData.push({ json: { calendars: response } });
                    }
                } else if (resource === 'event') {
                    // Terminoperationen mit Nextcloud-Anpassungen
                    if (operation === 'create') {
                        const eventData = this.getNodeParameter('eventFields', i) as IEventCreate;
                        const response = await eventActions.createEvent(this, eventData);
                        returnData.push({ json: parseNextcloudResponse(response) });
                    } else if (operation === 'delete') {
                        const calendarName = this.getNodeParameter('calendarName', i) as string;
                        const eventId = this.getNodeParameter('eventId', i) as string;
                        const response = await eventActions.deleteEvent(this, calendarName, eventId);
                        returnData.push({ json: response });
                    } else if (operation === 'get') {
                        const calendarName = this.getNodeParameter('calendarName', i) as string;
                        const eventId = this.getNodeParameter('eventId', i) as string;
                        const response = await eventActions.getEvent(this, calendarName, eventId);
                        returnData.push({ json: parseNextcloudResponse(response) });
                    } else if (operation === 'getAll') {
                        const calendarName = this.getNodeParameter('calendarName', i) as string;
                        const start = this.getNodeParameter('start', i) as string;
                        const end = this.getNodeParameter('end', i) as string;
                        const response = await eventActions.getEvents(this, calendarName, start, end);
                        const parsedEvents = response.map((event: any) => parseNextcloudResponse(event));
                        returnData.push({ json: { events: parsedEvents } });
                    } else if (operation === 'update') {
                        const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
                        const calendarName = this.getNodeParameter('calendarName', i) as string;
                        const eventId = this.getNodeParameter('eventId', i) as string;
                        const updateData: IEventUpdate = {
                            calendarName,
                            eventId,
                            title: updateFields.title as string,
                            start: updateFields.start as string,
                            end: updateFields.end as string,
                            description: updateFields.description as string | undefined,
                            location: updateFields.location as string | undefined,
                            attendees: updateFields.attendees as any[] | undefined,
                        };
                        const response = await eventActions.updateEvent(this, updateData);
                        returnData.push({ json: parseNextcloudResponse(response) });
                    }
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
