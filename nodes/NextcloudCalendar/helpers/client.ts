import {
    IExecuteFunctions,
    ILoadOptionsFunctions,
} from 'n8n-workflow';

import { DAVClient } from 'tsdav';

export async function initClient(
    context: IExecuteFunctions | ILoadOptionsFunctions,
) {
    const credentials = await context.getCredentials('nextcloudCalendarAuth');

    // Nextcloud-spezifische URL-Anpassung
    let serverUrl = credentials.serverUrl as string;
    if (!serverUrl.endsWith('/remote.php/dav')) {
        serverUrl = serverUrl.replace(/\/?$/, '/remote.php/dav');
    }

    const client = new DAVClient({
        serverUrl,
        credentials: {
            username: credentials.username as string,
            password: credentials.password as string,
        },
        defaultAccountType: 'caldav',
        authMethod: 'Basic',
    });

    await client.login();
    return client;
}
