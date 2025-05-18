import { INodeProperties } from 'n8n-workflow';

export const calendarOperations: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['calendar'],
            },
        },
        options: [
            {
                name: 'Erstellen',
                value: 'create',
                description: 'Einen neuen Kalender erstellen',
                action: 'Einen Kalender erstellen',
            },
            {
                name: 'Löschen',
                value: 'delete',
                description: 'Einen Kalender löschen',
                action: 'Einen Kalender löschen',
            },
            {
                name: 'Alle abrufen',
                value: 'getAll',
                description: 'Alle Kalender abrufen',
                action: 'Alle Kalender abrufen',
            },
        ],
        default: 'getAll',
    },
];

export const calendarFields: INodeProperties[] = [
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['calendar'],
                operation: ['create', 'delete'],
            },
        },
        default: '',
        description: 'Der Name des Kalenders',
    },
    {
        displayName: 'Kalender Details',
        name: 'calendarFields',
        type: 'collection',
        placeholder: 'Details hinzufügen',
        displayOptions: {
            show: {
                resource: ['calendar'],
                operation: ['create'],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Anzeigename',
                name: 'displayName',
                type: 'string',
                default: '',
                description: 'Der Anzeigename des Kalenders',
            },
            {
                displayName: 'Farbe',
                name: 'color',
                type: 'color',
                default: '#0082C9',
                description: 'Die Farbe des Kalenders',
            },
            {
                displayName: 'Beschreibung',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Die Beschreibung des Kalenders',
            },
        ],
    },
];
