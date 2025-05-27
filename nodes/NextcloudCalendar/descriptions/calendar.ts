import { INodeProperties } from 'n8n-workflow';

// Ressource: Kalender
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
                name: 'Get Many',
                value: 'getAll',
                description: 'Alle verfügbaren Kalender anzeigen',
                action: 'Show all available calendars',
            },
            {
                name: 'Erstellen',
                value: 'create',
                description: 'Einen neuen Kalender erstellen',
                action: 'Create a new calendar',
            },
            {
                name: 'Löschen',
                value: 'delete',
                description: 'Einen Kalender löschen',
                action: 'Delete a calendar',
            },
        ],
        default: 'getAll',
    },
];

export const calendarFields: INodeProperties[] = [
    // Kalender-Name für Kalender löschen
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
                resource: ['calendar'],
                operation: ['delete'],
            },
        },
        // @ts-expect-error: AIEnabled ist kein Standardfeld, wird aber von n8n AI genutzt
        AIEnabled: true,
    },

    // Kalender-Name für Erstellung
    {
        displayName: 'Kalender Name',
        name: 'name',
        type: 'string',
        required: true,
        default: '',
        typeOptions: {
            canBeExpression: true,
            AIEnabled: true
        },
        displayOptions: {
            show: {
                resource: ['calendar'],
                operation: ['create'],
            },
        },
        description: 'Name des neuen Kalenders',
    },

    // Kalender-Einstellungen
    {
        displayName: 'Kalender Einstellungen',
        name: 'calendarSettings',
        type: 'collection',
        placeholder: 'Einstellungen hinzufügen',
        default: {},
        displayOptions: {
            show: {
                resource: ['calendar'],
                operation: ['create'],
            },
        },
        options: [
            {
                displayName: 'Farbe',
                name: 'color',
                type: 'color',
                default: '#0082C9',
                description: 'Farbe des Kalenders in der Benutzeroberfläche',
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
                description: 'Beschreibung des Kalenders',
            },
        ],
    },
];
