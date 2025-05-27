import { IDataObject } from 'n8n-workflow';

export interface INextcloudCalendarConfig {
    hideEventExport?: boolean;
    sendInvitations?: boolean;
    enableNotifications?: boolean;
    enablePushNotifications?: boolean;
    forceEventAlarmType?: 'EMAIL' | 'DISPLAY';
}

export function getNextcloudHeaders(): { [key: string]: string } {
    return {
        'OCS-APIRequest': 'true',
        'User-Agent': 'n8n-nodes-nextcloud-calendar/1.0',
        'X-Requested-With': 'n8n'
    };
}

export function formatNextcloudEvent(eventData: IDataObject): IDataObject {
    const formattedEvent: IDataObject = {
        ...eventData,
        // Nextcloud-spezifische Eigenschaften
        'X-NC-GROUP-ID': eventData.uid || '',
        CLASS: 'PUBLIC',
    };

    // Spezielle Behandlung für Nextcloud Räume
    if (eventData.room) {
        formattedEvent['X-NC-ROOM'] = eventData.room;
    }

    // Spezielle Behandlung für Nextcloud Ressourcen
    if (eventData.resources) {
        formattedEvent['X-NC-RESOURCE'] = eventData.resources;
    }

    return formattedEvent;
}

export function parseNextcloudResponse(response: IDataObject): IDataObject {
    if (!response) {
        throw new Error('Keine Antwort vom Server erhalten');
    }

    if (typeof response !== 'object' || Object.keys(response).length === 0) {
        throw new Error('Ungültige oder leere Antwort vom Server');
    }

    const parsedResponse: IDataObject = {
        ...response,
    };

    // Extrahiere Nextcloud-spezifische Eigenschaften
    if (response['X-NC-GROUP-ID']) {
        parsedResponse.groupId = response['X-NC-GROUP-ID'];
    }

    if (response['X-NC-ROOM']) {
        parsedResponse.room = response['X-NC-ROOM'];
    }

    if (response['X-NC-RESOURCE']) {
        parsedResponse.resources = response['X-NC-RESOURCE'];
    }

    return parsedResponse;
}

export function getNextcloudCalendarConfig(config: IDataObject = {}): INextcloudCalendarConfig {
    return {
        hideEventExport: config.hideEventExport as boolean,
        sendInvitations: config.sendInvitations as boolean,
        enableNotifications: config.enableNotifications as boolean,
        enablePushNotifications: config.enablePushNotifications as boolean,
        forceEventAlarmType: config.forceEventAlarmType as 'EMAIL' | 'DISPLAY',
    };
}
