import {
    IExecuteFunctions,
    ILoadOptionsFunctions,
} from 'n8n-workflow';

import { DAVClient } from 'tsdav';

export async function initClient(
    context: IExecuteFunctions | ILoadOptionsFunctions,
) {
    const credentials = await context.getCredentials('nextcloudCalendarApi');

    // Nextcloud-spezifische URL-Anpassung
    let serverUrl = credentials.serverUrl as string;
    if (!serverUrl.endsWith('/remote.php/dav')) {
        serverUrl = serverUrl.replace(/\/?$/, '/remote.php/dav');
    }

    console.log(`Initialisiere CalDAV Client für: ${serverUrl}`);
    console.log(`Benutzername: ${credentials.username}`);
    console.log(`Passwort gesetzt: ${credentials.password ? 'Ja' : 'Nein'}`);
    console.log(`Passwort-Länge: ${credentials.password ? (credentials.password as string).length : 0}`);

    const client = new DAVClient({
        serverUrl,
        credentials: {
            username: credentials.username as string,
            password: credentials.password as string,
        },
        defaultAccountType: 'caldav',
        authMethod: 'Basic',
    });

    try {
        console.log('Versuche CalDAV Login...');
        await client.login();
        console.log('CalDAV Login erfolgreich');
        return client;
    } catch (error) {
        console.error('CalDAV Login fehlgeschlagen:', error);
        throw new Error(`CalDAV Authentifizierung fehlgeschlagen: ${error.message}. Bitte überprüfen Sie Ihre Credentials und verwenden Sie ein App-Passwort falls erforderlich.`);
    }
}
