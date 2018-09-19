// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
 
const path = require('path');
const restify = require('restify');
const env = require('dotenv').config();
// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
// Import required bot configuration.
const { BotConfiguration } = require('botframework-config');
// This bot's main dialog.
const { Bot } = require('./bot');

const BOT_CONFIG_ERROR = 1;
const DEV_ENVIRONMENT = 'development';

// bot name as defined in .bot file 
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);

// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '.env');

// Create HTTP server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3990, function () {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    console.log(`\nTo talk to your bot, open echoBot-with-counter.bot file in the Emulator`);
});

// .bot file path
const BOT_FILE = path.join(__dirname, (process.env.botFilePath || ''));
let botConfig;
try {
    // Read bot configuration from .bot file. 
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.log(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.log(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.log(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`)
    process.exit(BOT_CONFIG_ERROR);
}

// Get bot endpoint configuration by service name
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

// Create adapter. See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration .
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.microsoftAppID,
    appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword
});

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
let conversationState, userState;

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone. 
const memoryStorage = new MemoryStorage();
conversationState = new ConversationState(memoryStorage);
userState = new UserState(memoryStorage);
// CAUTION: You must ensure your product environment has the NODE_ENV set 
//          to use the Azure Blob storage or Azure Cosmos DB providers. 
// Storage configuration name or ID from .bot file
// const STORAGE_CONFIGURATION_ID = '<STORAGE-NAME-OR-ID-FROM-BOT-FILE>';
// // Default container name
// const DEFAULT_BOT_CONTAINER = '<DEFAULT-CONTAINER>';
// // Get service configuration
// const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
// const blobStorage = new BlobStorage({
//     containerName: (blobStorageConfig.container || DEFAULT_BOT_CONTAINER),
//     storageAccountOrConnectionString: blobStorageConfig.connectionString,
// });
// conversationState = new ConversationState(blobStorage);
// userState = new UserState(blobStorage);

// Create main dialog.
let bot;
try {
    bot = new Bot(conversationState, userState, botConfig);
} catch (err) {
    console.log(`Error: ${err}`);
    process.exit(BOT_CONFIGURATION_ERROR);
}

// Listen for incoming requests
server.post('/api/messages', (req, res) => {
    // Route received a request to adapter for processing
    adapter.processActivity(req, res, async (turnContext) => {
        // route to bot activity handler.
        await bot.onTurn(turnContext);
    });
});


// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log  
    // NOTE: In production environment, you should consider loggin this to Azure 
    //       application insights.
    console.log(`\n [Error]: ${ error }`);
    // Send a message to the user
    context.sendActivity(`Oops. Something went wrong!`);
    // Clear out state
    conversationState.clear(context);
};
