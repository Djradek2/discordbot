import { createRequire } from "module"; // Node.js built-in module
const require = createRequire(import.meta.url);

import dotenv from 'dotenv'
import { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import pg from 'pg'
const fs = require("pn/fs");
const xmljs = require("xml-js");
const svg2png = require("svg2png");
dotenv.config()

const { Client: DBClient } = pg
 
const db = new DBClient({
  user: 'josh',
  password: 'testingheslo8',
  host: '142.93.233.196',
  port: 5432,
  database: 'testdb',
})
await db.connect();

const query = {
  name: 'fetch-user',
  text: 'SELECT * FROM discordbot.\"exactQuestions\";',
}

const res = await db.query(query) //gets a question

const svgFile = fs.readFileSync("test.svg", "utf8");
const dataFile = fs.readFileSync("test.xml", "utf8");
let svgObject = xmljs.xml2js(svgFile, { compact: true });
let xmlObject = xmljs.xml2js(dataFile, { compact: true });
if (svgObject.svg.path) {
  const paths = Array.isArray(svgObject.svg.path) ? svgObject.svg.path : [svgObject.svg.path];
  paths.forEach((path) => {
    if (path._attributes && path._attributes.style) {
      path._attributes.style = "fill: rgb(126, 126, 126); stroke: rgb(0, 0, 0);";
    }
  });
}
const updatedSvg = xmljs.js2xml(svgObject, { compact: true, spaces: 2 });
fs.writeFileSync("updated_test.svg", updatedSvg, "utf8");

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
    //GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
});

client.login(process.env.DISCORD_TOKEN);

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

