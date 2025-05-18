/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-field-display-name-missing-api */
/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */

import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NextcloudCalendarAuth implements ICredentialType {
	name = 'nextcloudCalendarAuth';
	displayName = 'Nextcloud Kalender Authentifizierung';
	documentationUrl = 'https://docs.nextcloud.com/server/latest/user_manual/de/groupware/calendar.html';
	properties: INodeProperties[] = [
		{
			displayName: 'Nextcloud URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://ihre-nextcloud-instanz.de',
			required: true,
		},
		{
			displayName: 'Benutzername',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Passwort',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}/remote.php/dav',
			url: '/calendars/{{$credentials.username}}',
			method: 'GET',
			headers: {
				Depth: '0',
			},
		},
	};
}
