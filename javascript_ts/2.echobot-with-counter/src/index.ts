// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as restify from 'restify';
import * as path from 'path';
import { config } from 'dotenv';
import { BotFrameworkAdapter, MemoryStorage, ConversationState } from 'botbuilder';
import { BotConfiguration, IEndpointService, IBlobStorageService } from 'botframework-config';

import { MainDialog } from './dialogs/mainDialog';

const BOT_CONFIG_ERROR = 1;

// bot name as defined in .bot file 
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration .
const BOT_CONFIGURATION = (process.env.NODE_ENV || 'development');

// Read botFilePath and botFileSecret from .env file.
const ENV_FILE = path.join(__dirname, '..', '.env');
const loadFromEnv = config({path: ENV_FILE});

// Create HTTP server.
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3985, function () {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    console.log(`\nTo talk to your bot, open echobot-with-counter.bot file in the Emulator.`);
});

// .bot file path
const BOT_FILE = path.join(__dirname, '..', (process.env.botFilePath || ''));
let botConfig;
try {
    // read bot configuration from .bot file.
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.log(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.log(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.log(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`)
    process.exit(BOT_CONFIG_ERROR);
}

// Get bot endpoint configuration by service name
const endpointConfig = <IEndpointService>botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

// Create adapter. See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration .
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.microsoftAppID,
    appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword
});

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.

// const memoryStorage = new MemoryStorage();
// Create conversation state with in-memory storage provider. 
// const conversationState = new ConversationState(memoryStorage);


import { BlobStorage } from 'botbuilder-azure';
const STORAGE_CONFIGURATION_ID = '2';
const blobStorageConfig = <IBlobStorageService>botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
const blobStorage = new BlobStorage({
    containerName: blobStorageConfig.container,
    storageAccountOrConnectionString: blobStorageConfig.connectionString,
});
const conversationState = new ConversationState(blobStorage);

//import { BlobStorage } from 'botbuilder-azure';
//const STORAGE_CONFIGURATION_ID = '<ID OF YOUR BLOB STORAGE CONFIGURATION FROM .BOT FILE>';

// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone. 
// For production bots use the Azure Cosmos DB storage, Azure Blob storage providers. 
// const { CosmosDbStorage } = require('botbuilder-azure');
// const STORAGE_CONFIGURATION = 'cosmosDB'; // this is the name of the Cosmos DB configuration in your .bot file
// const cosmosConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION);
// const cosmosStorage = new CosmosDbStorage({serviceEndpoint: cosmosConfig.connectionString, 
//                                            authKey: ?, 
//                                            databaseId: cosmosConfig.database, 
//                                            collectionId: cosmosConfig.collection});



// Create the main dialog.
const mainDlg = new MainDialog(conversationState);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // route to main dialog.
        await mainDlg.onTurn(context);        
    });
});

