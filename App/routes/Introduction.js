const express = require('express');
const axios = require('axios');
const OpenAI = require('openai')
const openai = new OpenAI(api_key = process.env.OPENAI_API_KEY);
const config = require('../config'); // Import the config.js file
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg'); // Import ffmpeg for audio processing
const ffmpegPath = require('ffmpeg-static'); // Path to the static binary
ffmpeg.setFfmpegPath(ffmpegPath); // Set the path explicitly
const router = express.Router()
const path = require('path');

router.use(express.static(path.join(__dirname, 'public')));
const jsonDir = path.resolve(__dirname, './json')
var sql = require("mssql");
const { v4: uuidv4 } = require('uuid');

const rpPath = path.join(jsonDir, '/Introduction/Introduction_ScriptAndAudio_RP.json');

// Preload data at the beginning
let rpData;

try {
    rpData = JSON.parse(fs.readFileSync(rpPath, 'utf8'));
    console.log("Successfully preloaded RP script metadata.");
} catch (err) {
    console.error("Error reading or parsing RP Script JSON:", err);
    rpData = []; // Fallback to empty data
}




router.post('/:nodeId', async (req, res, next) => {

    var scriptData;
    const condition = req.session.params?.condition; // Safely access the condition
    const gender = req.session.params?.gender;

    scriptData = rpData;
    const nodeId = parseInt(req.params.nodeId);
    const additionalData = req.body || {};


    // console.log(`Incoming request for nodeId: ${nodeId}`);
    // console.log(`Additional data received: ${JSON.stringify(additionalData)}`);

    try {
        // Find node data in preloaded metadata
        const nodeData = scriptData.find(item => item.nodeId === nodeId);

        if (!nodeData) {
            console.error(`Node with ID ${nodeId} not found.`);
            return res.status(404).json({ error: `Node with ID ${nodeId} not found` });
        }

        if (nodeData.dialogue) {
            // console.log("Pre-recorded response detected.");
            const audio = gender === "male" ? nodeData.audioM : nodeData.audioF;
            // Create responseData by excluding audioM and audioF, and include the selected audio
            const { audioM, audioF, ...rest } = nodeData; // Exclude audioM and audioF
            const responseData = {
                ...rest,
                audio: audio // Include the selected audio
            };
            // console.log("Sending pre-recorded response:", responseData.dialogue);
            res.setHeader('Content-Type', 'application/json; type=prerecorded');
            return res.json(responseData);
        }
    } catch (err) {
        console.error('Error during request processing:', err);
        return res.status(500).json({ error: 'Failed to process request' });
    }
});

// Route to generate audio for all dialogue nodes and save as JSON
router.get("/generate/start", async (req, res) => {
    const audioMetadata = [];
    const inputFile = path.join(jsonDir, 'Introduction/Introduction_Script_RP.json');
    const outputFile = path.join(jsonDir, 'Introduction/Introduction_ScriptAndAudio_RP.json');

    // Load the original JSON data
    let dialogueNodes;
    try {
        dialogueNodes = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    } catch (error) {
        console.error("Error reading input JSON file:", error);
        return res.status(500).json({ error: 'Failed to read input JSON file.' });
    }

    // Process each node
    for (const node of dialogueNodes) {
        try {
            let audioDataF = null;
            let audioDataM = null;

            // Process nodes with dialogue
            if (node.dialogue && (node.response == null || node.response.alterDialogue === false)) {
                const textToConvert = node.dialogue;

                // Generate audio for Female voice
                audioDataF = await generateAudio(textToConvert, 'shimmer');

                // Generate audio for Male voice
                audioDataM = await generateAudio(textToConvert, 'echo');
            }

            // Add audioM and audioF fields to the node
            const updatedNode = {
                ...node,
                audioM: audioDataM,
                audioF: audioDataF,
            };

            audioMetadata.push(updatedNode);
        } catch (error) {
            console.error(`Error processing node ${node.nodeId}:`, error);
        }
    }

    // Save the updated JSON
    try {
        await fs.promises.writeFile(outputFile, JSON.stringify(audioMetadata, null, 2));
        console.log(`Updated JSON with audio metadata saved to ${outputFile}`);
    } catch (error) {
        console.error("Error writing updated JSON to file:", error);
        return res.status(500).json({ error: 'Failed to write updated JSON file.' });
    }

    res.json({ message: 'Audio generation complete', outputFile });
});

// Function to generate audio and transcriptions
async function generateAudio(text, voice) {
    try {
        // Generate speech
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            response_format: "wav",
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const uniqueFilename = `speech_${uuidv4()}.wav`;
        const speechFile = path.resolve(__dirname, `./audio/${uniqueFilename}`);

        await fs.promises.writeFile(speechFile, buffer);

        // Adjust audio speed
        const spedUpFilename = `spedup_${uniqueFilename}`;
        const spedUpFilePath = path.resolve(__dirname, `./audio/${spedUpFilename}`);

        await new Promise((resolve, reject) => {
            ffmpeg(speechFile)
                .audioFilters('atempo=1.1') // Speed up the audio
                .save(spedUpFilePath)
                .on('end', resolve)
                .on('error', reject);
        });

        // Convert to Base64
        const spedUpBuffer = await fs.promises.readFile(spedUpFilePath);
        const audioBase64 = spedUpBuffer.toString('base64');

        // Transcribe audio
        const transcriptionResponse = await openai.audio.transcriptions.create({
            file: fs.createReadStream(spedUpFilePath),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word", "segment"],
        });

        if (transcriptionResponse && transcriptionResponse.words) {
            return {
                audioBase64: audioBase64,
                words: transcriptionResponse.words.map(x => x.word),
                wtimes: transcriptionResponse.words.map(x => 1000 * x.start - 150),
                wdurations: transcriptionResponse.words.map(x => 1000 * (x.end - x.start)),
            };
        }

        return null;
    } catch (error) {
        console.error("Error generating audio:", error);
        return null;
    }
}



module.exports = router;