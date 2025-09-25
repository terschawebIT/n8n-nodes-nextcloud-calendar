import { INodeProperties } from 'n8n-workflow';

// Event-Operationen
export const eventOperations: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['event'],
            },
        },
        options: [
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Sucht nach Terminen in einem Zeitraum',
                action: 'Find events in a time range',
            },
            {
                name: 'Nach Terminen Suchen',
                value: 'search',
                description: 'Sucht nach bestimmten Suchbegriffen in Terminen',
                action: 'Search for specific terms in events',
            },
            {
                name: 'Nächste Termine Anzeigen',
                value: 'nextEvents',
                description: 'Zeigt anstehende Termine',
                action: 'Show upcoming events',
            },
            {
                name: 'Termin Ändern',
                value: 'update',
                description: 'Ändert einen bestehenden Termin',
                action: 'Update an existing event',
            },
            {
                name: 'Termin Anzeigen',
                value: 'get',
                description: 'Einen Termin anzeigen',
                action: 'Display an event',
            },
            {
                name: 'Termin Erstellen',
                value: 'create',
                description: 'Erstellt einen neuen Termin',
                action: 'Create a new event',
            },
            {
                name: 'Termin Löschen',
                value: 'delete',
                description: 'Löscht einen Termin',
                action: 'Delete an event',
            },
        ],
        default: 'nextEvents',
    },
];

export const eventFields: INodeProperties[] = [
    // Kalender-Name für alle Event-Operationen
    {
        displayName: 'Kalender',
        name: 'calendarName',
        type: 'resourceLocator',
        default: '',
        required: true,
        description: 'Wählen Sie einen Kalender aus der Liste oder geben Sie dessen ID an',
        modes: [
            {
                displayName: 'Liste',
                name: 'list',
                type: 'list',
                typeOptions: {
                    searchListMethod: 'getCalendars',
                    searchable: true,
                    searchFilterRequired: false,
                },
            },
            {
                displayName: 'ID',
                name: 'id',
                type: 'string',
                placeholder: 'Kalender-ID',
                validation: [
                    {
                        type: 'regex',
                        properties: {
                            regex: '^.+$',
                            errorMessage: 'Bitte eine gültige Kalender-ID eingeben',
                        },
                    },
                ],
            },
        ],
        displayOptions: {
            show: {
                resource: ['event'],
            },
        },
        // @ts-expect-error: AIEnabled ist kein Standardfeld, wird aber von n8n AI genutzt
        AIEnabled: true,
    },

    // Event-ID für Operationen, die eine Event-ID benötigen
    {
        displayName: 'Termin ID',
        name: 'eventId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['delete', 'get', 'update'],
            },
        },
        description: 'ID des Termins',
    },

    // Event-Felder für Termin erstellen
    {
        displayName: 'Titel',
        name: 'title',
        type: 'string',
        required: true,
        default: '',
        typeOptions: {
            canBeExpression: true,
            AIEnabled: true
        },
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create', 'update'],
            },
        },
        description: 'Titel des Termins',
    },
    {
        displayName: 'Start',
        name: 'start',
        type: 'dateTime',
        required: true,
        default: '={{ $now }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create', 'update'],
            },
        },
        description: 'Startzeit des Termins',
    },
    {
        displayName: 'Ende',
        name: 'end',
        type: 'dateTime',
        required: true,
        default: '={{ $now.plus({ hour: 1 }).toISO() }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create', 'update'],
            },
        },
        description: 'Endzeit des Termins',
    },
    {
        displayName: 'Beschreibung',
        name: 'description',
        type: 'string',
        default: '',
        typeOptions: {
            canBeExpression: true,
            AIEnabled: true
        },
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        description: 'Beschreibung des Termins',
    },
    {
        displayName: 'Ort',
        name: 'location',
        type: 'string',
        default: '',
        typeOptions: {
            canBeExpression: true,
            AIEnabled: true
        },
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        description: 'Ort des Termins',
    },
    {
        displayName: 'Einladungen Aktivieren',
        name: 'sendInvitations',
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        description: 'Whether to send invitations to attendees',
    },
    {
        displayName: 'Teilnehmer',
        name: 'attendees',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Teilnehmer',
                name: 'attendeeFields',
                values: [
                    {
                        displayName: 'E-Mail',
                        name: 'email',
                        type: 'string',
                        placeholder: 'name@email.com',
                        required: true,
                        default: '',
                    },
                    {
                        displayName: 'Anzeigename',
                        name: 'displayName',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'RSVP',
                        name: 'rsvp',
                        type: 'boolean',
                        default: true,
                        description: 'Whether a response is expected from the attendee',
                    },
                    {
                        displayName: 'Rolle',
                        name: 'role',
                        type: 'options',
                        options: [
                            {
                                name: 'Erforderlicher Teilnehmer',
                                value: 'REQ-PARTICIPANT',
                            },
                            {
                                name: 'Optionaler Teilnehmer',
                                value: 'OPT-PARTICIPANT',
                            },
                            {
                                name: 'Organisator',
                                value: 'CHAIR',
                            },
                        ],
                        default: 'REQ-PARTICIPANT',
                    },
                ],
            },
        ],
        description: 'Teilnehmer zum Termin hinzufügen',
    },

    // Zeitzone (konfigurierbar)
    {
        displayName: 'Zeitzone',
        name: 'timeZone',
        type: 'string',
        default: 'UTC',
        placeholder: 'z. B. Europe/Berlin',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        description: 'Zeitzone für DTSTART/DTEND (TZID). Leer lassen für UTC.',
    },

    // Zeitraum für Termine suchen
    {
        displayName: 'Start',
        name: 'start',
        type: 'dateTime',
        required: true,
        default: '={{ $now }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['getAll'],
            },
        },
        description: 'Startzeit für die Terminsuche',
    },
    {
        displayName: 'Ende',
        name: 'end',
        type: 'dateTime',
        required: true,
        default: '={{ $now.plus({ month: 1 }).toISO() }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['getAll'],
            },
        },
        description: 'Endzeit für die Terminsuche',
    },

    // Felder zum Aktualisieren eines Termins
    {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Feld aktualisieren',
        default: {},
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['update'],
            },
        },
        options: [
            {
                displayName: 'Beschreibung',
                name: 'description',
                type: 'string',
                default: '',
                typeOptions: {
                    canBeExpression: true,
                    AIEnabled: true
                },
                description: 'Neue Beschreibung des Termins',
            },
            {
                displayName: 'Ende',
                name: 'end',
                type: 'dateTime',
                default: '',
                description: 'Neue Endzeit des Termins',
            },
            {
                displayName: 'Ort',
                name: 'location',
                type: 'string',
                default: '',
                typeOptions: {
                    canBeExpression: true,
                    AIEnabled: true
                },
                description: 'Neuer Ort des Termins',
            },
            {
                displayName: 'Start',
                name: 'start',
                type: 'dateTime',
                default: '',
                description: 'Neue Startzeit des Termins',
            },
            {
                displayName: 'Titel',
                name: 'title',
                type: 'string',
                default: '',
                typeOptions: {
                    canBeExpression: true,
                    AIEnabled: true
                },
                description: 'Neuer Titel des Termins',
            },
        ],
    },

    {
        displayName: 'Einladungen Aktivieren',
        name: 'sendInvitations',
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['update'],
            },
        },
        description: 'Whether to send invitations to attendees',
    },

    {
        displayName: 'Teilnehmer',
        name: 'attendees',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['update'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Teilnehmer',
                name: 'attendeeFields',
                values: [
                    {
                        displayName: 'E-Mail',
                        name: 'email',
                        type: 'string',
                        placeholder: 'name@email.com',
                        required: true,
                        default: '',
                    },
                    {
                        displayName: 'Anzeigename',
                        name: 'displayName',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'RSVP',
                        name: 'rsvp',
                        type: 'boolean',
                        default: true,
                        description: 'Whether a response is expected from the attendee',
                    },
                    {
                        displayName: 'Rolle',
                        name: 'role',
                        type: 'options',
                        options: [
                            {
                                name: 'Erforderlicher Teilnehmer',
                                value: 'REQ-PARTICIPANT',
                            },
                            {
                                name: 'Optionaler Teilnehmer',
                                value: 'OPT-PARTICIPANT',
                            },
                            {
                                name: 'Organisator',
                                value: 'CHAIR',
                            },
                        ],
                        default: 'REQ-PARTICIPANT',
                    },
                ],
            },
        ],
        description: 'Teilnehmer zum Termin hinzufügen',
    },

    // Nextcloud-spezifische Einstellungen
    {
        displayName: 'Nextcloud Einstellungen',
        name: 'nextcloudSettings',
        type: 'collection',
        placeholder: 'Nextcloud-Einstellungen hinzufügen',
        default: {},
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create', 'update']
            },
        },
        options: [
            {
                displayName: 'Alarm-Typ Erzwingen',
                name: 'forceEventAlarmType',
                type: 'options',
                options: [
                    {
                        name: 'E-Mail',
                        value: 'EMAIL',
                    },
                    {
                        name: 'Anzeige',
                        value: 'DISPLAY',
                    }
                ],
                default: 'DISPLAY',
                description: 'Erzwingt einen bestimmten Alarm-Typ für Termine',
                displayOptions: {
                    show: {
                        '/resource': ['event'],
                        enableNotifications: [true],
                    },
                },
            },
            {
                displayName: 'Benachrichtigungen Aktivieren',
                name: 'enableNotifications',
                type: 'boolean',
                default: true,
                description: 'Whether to enable notifications for events',
            },
            {
                displayName: 'Export Ausblenden',
                name: 'hideEventExport',
                type: 'boolean',
                default: false,
                description: 'Whether to hide the export buttons in the user interface',
            },
            {
                displayName: 'Push-Benachrichtigungen Aktivieren',
                name: 'enablePushNotifications',
                type: 'boolean',
                default: true,
                description: 'Whether to enable push notifications for events',
            },
        ],
    },

    // Zeitraum für nächste Termine
    {
        displayName: 'Max. Anzahl Termine',
        name: 'maxEvents',
        type: 'number',
        default: 10,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['nextEvents'],
            },
        },
        description: 'Maximale Anzahl der zurückgegebenen Termine',
    },

    // Felder für die Terminsuche
    {
        displayName: 'Suchbegriff',
        name: 'searchTerm',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['search'],
            },
        },
        description: 'Suchbegriff zum Finden von Terminen (sucht in Titel, Beschreibung und Ort)',
    },
    {
        displayName: 'Start',
        name: 'start',
        type: 'dateTime',
        required: true,
        default: '={{ $now }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['search'],
            },
        },
        description: 'Startzeit für den Suchzeitraum',
    },
    {
        displayName: 'Ende',
        name: 'end',
        type: 'dateTime',
        required: true,
        default: '={{ $now.plus({ month: 3 }).toISO() }}',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['search'],
            },
        },
        description: 'Endzeit für den Suchzeitraum',
    },
    {
        displayName: 'Suchoptionen',
        name: 'searchOptions',
        type: 'collection',
        placeholder: 'Optionen hinzufügen',
        default: {},
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['search'],
            },
        },
        options: [
            {
                displayName: 'Nur in Titeln Suchen',
                name: 'titlesOnly',
                type: 'boolean',
                default: false,
                description: 'Whether to search only in event titles instead of all fields',
            },
            {
                displayName: 'Exakte Übereinstimmung',
                name: 'exactMatch',
                type: 'boolean',
                default: false,
                description: 'Whether to search for exact matches instead of partial matches',
            },
            {
                displayName: 'Groß-/Kleinschreibung Beachten',
                name: 'caseSensitive',
                type: 'boolean',
                default: false,
                description: 'Whether to make the search case sensitive',
            },
        ],
    },
];
