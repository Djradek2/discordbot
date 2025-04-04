//import { createRequire } from "module"; // Node.js built-in module
//const require = createRequire(import.meta.url);

// import dotenv from 'dotenv'
// import pg from 'pg'
// import { Client, Collection, Events, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, REST, Routes } from 'discord.js';
// import { fileURLToPath, pathToFileURL } from 'url';
// import { dirname } from 'path';
const dotenv = require('dotenv');
const pg = require('pg');
const { Client, Collection, Events, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, REST, Routes } = require('discord.js');
const fs = require("pn/fs");
const xmljs = require("xml-js");
const svg2png = require("svg2png");
const nodePath = require('node:path');
const server = require('./class/server.js')
dotenv.config()

const { Client: DBClient } = pg
const db = new DBClient({
  user: 'josh',
  password: 'testingheslo8',
  host: '142.93.233.196',
  port: 5432,
  database: 'testdb',
})
setupServer()

// const svgFile = fs.readFileSync("test.svg", "utf8");
// const dataFile = fs.readFileSync("test.xml", "utf8");
// let svgObject = xmljs.xml2js(svgFile, { compact: true });
// let xmlObject = xmljs.xml2js(dataFile, { compact: true });
// if (svgObject.svg.path) {
//   const paths = Array.isArray(svgObject.svg.path) ? svgObject.svg.path : [svgObject.svg.path];
//   paths.forEach((path) => {
//     if (path._attributes && path._attributes.style) {
//       path._attributes.style = "fill: rgb(126, 126, 126); stroke: rgb(0, 0, 0);";
//     }
//   });
// }
// const updatedSvg = xmljs.js2xml(svgObject, { compact: true, spaces: 2 });
// fs.writeFileSync("updated_test.svg", updatedSvg, "utf8");

async function setupServer () {
  let serverVar = new server.Server();

  await db.connect();
  const query = {
    name: 'fetch-user',
    text: 'SELECT * FROM discordbot.\"exactQuestions\";',
  }
  const res = await db.query(query)

  const testRow = new ActionRowBuilder()
  const correctButton = new ButtonBuilder().setCustomId("test1").setLabel(res['rows'][0]['correct']).setStyle(ButtonStyle.Primary);
  const falseButton1 = new ButtonBuilder().setCustomId("test2").setLabel(res['rows'][0]['option1']).setStyle(ButtonStyle.Primary);
  const falseButton2 = new ButtonBuilder().setCustomId("test3").setLabel(res['rows'][0]['option2']).setStyle(ButtonStyle.Primary);
  const falseButton3 = new ButtonBuilder().setCustomId("test4").setLabel(res['rows'][0]['option3']).setStyle(ButtonStyle.Primary);

  testRow.addComponents(correctButton)
  testRow.addComponents(falseButton1)
  testRow.addComponents(falseButton2)
  testRow.addComponents(falseButton3)

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages
    ],
  });
  client.login(process.env.DISCORD_TOKEN);
  
  client.commands = new Collection(); //command load start
  const foldersPath = nodePath.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);
  
  for (const folder of commandFolders) {
    const commandsPath = nodePath.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.cjs'));
    for (const file of commandFiles) {
      const filePath = nodePath.join(commandsPath, file);
      let command = require(filePath);
      client.commands.set(command.name, command);
    }
  }
  
  const rest = new REST().setToken(process.env.DISCORD_TOKEN); //start sending command to discord
  (async () => {
    try {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: client.commands },
      );
    } catch (error) {
      console.error(error);
    }
  })();
  
  client.on(Events.InteractionCreate, async interaction => { //try to execute called command
    if (!interaction.isChatInputCommand()) {
      return;
    }
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    try {
      await command.execute(interaction, serverVar);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!' });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!' });
      }
    }
  });
  
  client.on('messageCreate', async (message) => {
    if(!message?.author.bot){
      let imageBuffer = await fs.readFile("test.svg").then(svg2png)
      let memberResponse = await message.author.send({
        content: res['rows'][0]['question_text'],
        components: [testRow],
        files: [{ attachment: imageBuffer }]
      });
  
      const collector = memberResponse.createMessageComponentCollector({
        time: 60000,
      });
    
      collector.on('collect', async (interaction) => {
        if (!interaction.isButton()) {
          return;
        }
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: "You can't interact with this button!", ephemeral: true });
        }
        if (interaction.customId === 'test1') {
          await interaction.reply({ content: 'Correct!'});
        } else {
          await interaction.reply({ content: 'You dumb af!'});
        }
      });
    }
  })
  
}