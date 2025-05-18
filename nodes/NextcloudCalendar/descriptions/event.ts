import { INodeProperties } from 'n8n-workflow';

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
                name: 'Erstellen',
                value: 'create',
                description: 'Einen neuen Termin erstellen',
                action: 'Einen Termin erstellen',
            },
            {
                name: 'Löschen',
                value: 'delete',
                description: 'Einen Termin löschen',
                action: 'Einen Termin löschen',
            },
            {
                name: 'Abrufen',
                value: 'get',
                description: 'Einen Termin abrufen',
                action: 'Einen Termin abrufen',
            },
            {
                name: 'Alle abrufen',
                value: 'getAll',
                description: 'Alle Termine abrufen',
                action: 'Alle Termine abrufen',
            },
            {
                name: 'Aktualisieren',
                value: 'update',
                description: 'Einen Termin aktualisieren',
                action: 'Einen Termin aktualisieren',
            },
        ],
        default: 'getAll',
    },
];

export const eventFields: INodeProperties[] = [
    {
        displayName: 'Kalender',
        name: 'calendarName',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getCalendars',
        },
        required: true,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create', 'delete', 'get', 'getAll', 'update'],
            },
        },
        default: '',
        description: 'Der Kalender, in dem der Termin erstellt werden soll',
    },
    {
        displayName: 'Termin ID',
        name: 'eventId',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['delete', 'get', 'update'],
            },
        },
        default: '',
        description: 'Die ID des Termins',
    },
    {
        displayName: 'Termin Details',
        name: 'eventFields',
        type: 'collection',
        placeholder: 'Details hinzufügen',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['create'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Titel',
                name: 'title',
                type: 'string',
                default: '',
                description: 'Der Titel des Termins',
                required: true,
            },
            {
                displayName: 'Start',
                name: 'start',
                type: 'dateTime',
                default: '',
                description: 'Der Startzeitpunkt des Termins',
                required: true,
            },
            {
                displayName: 'Ende',
                name: 'end',
                type: 'dateTime',
                default: '',
                description: 'Der Endzeitpunkt des Termins',
                required: true,
            },
            {
                displayName: 'Beschreibung',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Die Beschreibung des Termins',
            },
            {
                displayName: 'Ort',
                name: 'location',
                type: 'string',
                default: '',
                description: 'Der Ort des Termins',
            },
            {
                displayName: 'Teilnehmer',
                name: 'attendees',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                },
                default: {},
                options: [
                    {
                        name: 'attendeeFields',
                        displayName: 'Teilnehmer',
                        values: [
                            {
                                displayName: 'E-Mail',
                                name: 'email',
                                type: 'string',
                                default: '',
                                description: 'Die E-Mail-Adresse des Teilnehmers',
                                required: true,
                            },
                            {
                                displayName: 'Name',
                                name: 'displayName',
                                type: 'string',
                                default: '',
                                description: 'Der Name des Teilnehmers',
                            },
                            {
                                displayName: 'Rolle',
                                name: 'role',
                                type: 'options',
                                options: [
                                    {
                                        name: 'Erforderlich',
                                        value: 'REQ-PARTICIPANT',
                                    },
                                    {
                                        name: 'Optional',
                                        value: 'OPT-PARTICIPANT',
                                    },
                                    {
                                        name: 'Organisator',
                                        value: 'CHAIR',
                                    },
                                ],
                                default: 'REQ-PARTICIPANT',
                            },
                            {
                                displayName: 'Status',
                                name: 'status',
                                type: 'options',
                                options: [
                                    {
                                        name: 'Akzeptiert',
                                        value: 'ACCEPTED',
                                    },
                                    {
                                        name: 'Abgelehnt',
                                        value: 'DECLINED',
                                    },
                                    {
                                        name: 'Vorläufig',
                                        value: 'TENTATIVE',
                                    },
                                    {
                                        name: 'Ausstehend',
                                        value: 'NEEDS-ACTION',
                                    },
                                ],
                                default: 'NEEDS-ACTION',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        displayName: 'Update Felder',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Felder aktualisieren',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['update'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Titel',
                name: 'title',
                type: 'string',
                default: '',
                description: 'Der neue Titel des Termins',
            },
            {
                displayName: 'Start',
                name: 'start',
                type: 'dateTime',
                default: '',
                description: 'Der neue Startzeitpunkt des Termins',
            },
            {
                displayName: 'Ende',
                name: 'end',
                type: 'dateTime',
                default: '',
                description: 'Der neue Endzeitpunkt des Termins',
            },
            {
                displayName: 'Beschreibung',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Die neue Beschreibung des Termins',
            },
            {
                displayName: 'Ort',
                name: 'location',
                type: 'string',
                default: '',
                description: 'Der neue Ort des Termins',
            },
        ],
    },
    {
        displayName: 'Zeitraum Start',
        name: 'start',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['getAll'],
            },
        },
        default: '',
        description: 'Der Startzeitpunkt des Zeitraums',
    },
    {
        displayName: 'Zeitraum Ende',
        name: 'end',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['getAll'],
            },
        },
        default: '',
        description: 'Der Endzeitpunkt des Zeitraums',
    },
];
