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

export async function resolveOrganizerInfo(
    context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<{ email?: string; displayName?: string; username?: string; hostname?: string }> {
    const credentials = await context.getCredentials('nextcloudCalendarApi');

    const serverUrl = String(credentials.serverUrl || '');
    let hostname = '';
    try { hostname = new URL(serverUrl).hostname; } catch {}

    const username = String(credentials.username || '');
    const password = String(credentials.password || '');

    // Falls Credentials bereits eine E-Mail enthalten (optional), vorrangig nutzen
    const explicitEmail = (credentials as { email?: string })?.email;
    if (explicitEmail && explicitEmail.includes('@')) {
        return { email: explicitEmail, displayName: username, username, hostname };
    }

    // Versuche OCS-API: /ocs/v2.php/cloud/user?format=json
    try {
        const ocsUrl = new URL('/ocs/v2.php/cloud/user?format=json', serverUrl);
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const res = await fetch(ocsUrl.toString(), {
            method: 'GET',
            headers: {
                'OCS-APIRequest': 'true',
                'Accept': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
        });
        if (res.ok) {
            const data: unknown = await res.json();
            const ocs = (data && typeof data === 'object' && 'ocs' in (data as Record<string, unknown>))
                ? ((data as { ocs?: { data?: Record<string, unknown> } }).ocs?.data || {})
                : {};
            const email: string | undefined = ocs.email && typeof ocs.email === 'string' ? ocs.email : undefined;
            const displayName: string | undefined = ocs.displayname && typeof ocs.displayname === 'string' ? ocs.displayname : username;
            if (email && email.includes('@')) {
                return { email, displayName, username, hostname };
            }
        }
    } catch {
        // OCS nicht verfügbar – Fallback unten
    }

    // Fallback: username@hostname
    const fallbackEmail = username && hostname ? `${username}@${hostname}` : undefined;
    return { email: fallbackEmail, displayName: username || undefined, username, hostname };
}
