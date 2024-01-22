// this is the function that runs the writer assistant
const OpenAI = require('openai');
const fs = require('fs');
const { get } = require('http');

const execute = async (name, instructions) => {
// this puts a message onto a thread and then runs the assistant on that thread
    let assistant_id;
    let thread_id;
    let run_id;
    let messages = [];
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.beta.assistants.list({
        order: "desc",
        limit: 10,
    })
    // loop over all assistants and find the one with the name name
    for(obj in response.data){
        let assistant = response.data[obj];
        // change assistant.name to small letters
        if(assistant.name.toLowerCase() == name){
            assistant_id = assistant.id;
            break
        }
    }
    // get a new thread to operate on

    let thread = await openai.beta.threads.create()
    thread_id = thread.id;

    async function runAssistant(assistant_id, thread_id, user_instructions){
        try {
            await openai.beta.threads.messages.create(thread_id,
                {
                    role: "user",
                    content: user_instructions,
                })
            let run = await openai.beta.threads.runs.create(thread_id, {
                assistant_id: assistant_id
            })
            run_id = run.id;
            get_run_status(thread_id, run_id, messages);
        }
        catch (error) {
            console.log(error);
            return error;
        }
    }
    async function get_run_status(thread_id, run_id, messages) {
        try {
            let runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            while (runStatus.status !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 1 second
                runStatus = await openai.beta.threads.runs.retrieve(thread_id, run_id);
            }
            let message = await openai.beta.threads.messages.list(thread_id)
            addLastMessagetoArray(message, messages)
        }
        catch (error) {
            console.log(error);
            return error; 
        }
    }
    function addLastMessagetoArray(message, messages){
        messages.push(message.data[0].content[0].text.value)
        console.log("PRINTING MESSAGES: ");
        console.log(message.data[0].content[0].text.value)
    }
    
    runAssistant(assistant_id, thread_id, instructions);
    return messages;
}

const details = {
    name: "writer",
    description: "This is a fiction writer that can write stories based on instructions",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the assistant to use. eg writer",
        },
        instructions: {
          type: "string",
          description: "The instructions to the assistant. eg Write a story about a dog",
        },
      },
      required: ["name", "instructions"],
    },
    example: "Get Assistant called Writer and run it with instructions 'Write a story about a dog'",
};
module.exports = { execute, details };