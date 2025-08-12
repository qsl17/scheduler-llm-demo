// src/features/llm/ollamatoolScheduler.ts
// Import generated API clients
import { Manpower } from "../../api/manpower";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { EventAssignmentControllerService } from "../../api/optaplanner/services/EventAssignmentControllerService";
import ollama from "ollama";
import { defaultConstraintSettings } from "./constraints";

// Tool definition for fetchAllManpower
// const fetchAllManpowerTool = {
//   type: "function",
//   function: {
//     name: "fetchAllManpower",
//     description: "Fetch all manpower from the backend API",
//     parameters: {
//       type: "object",
//       properties: {},
//     },
//   },
// };

// Tool definition for getAssignmentList
let personListCache: any[] = [];
let assignmentListCache: any[] = [];
// const getAssignmentListTool = {
//   type: "function",
//   function: {
//     name: "getAssignmentList",
//     description: "Get the current list of event assignments for the scheduler.",
//     parameters: {
//       type: "object",
//       properties: {},
//     },
//   },
// };

// const getOptimizationParametersTool = {
//   type: "function",
//   function: {
//     name: "getOptimizationParameters",
//     description:
//       "Get an object with current list of event assignments and list of manpower that needs to be optimized.",
//     parameters: {
//       type: "object",
//       properties: {
//         personList: {
//           type: "array",
//           description: "List of manpower/persons",
//           items: { type: "object" },
//         },
//         assignmentList: {
//           type: "array",
//           description: "List of event assignments",
//           items: { type: "object" },
//         },
//       },
//     },
//   },
// };
// Tool definition for solveScheduler
const solveSchedulerTool = {
  type: "function",
  function: {
    name: "solveScheduler",
    description:
      "Solve the event assignment problem using the OptaPlanner solver API",
    parameters: {
      type: "object",
      properties: {
        // personList: {
        //   type: "array",
        //   description: "List of manpower/persons",
        //   items: { type: "object" },
        // },
        // assignmentList: {
        //   type: "array",
        //   description: "List of event assignments",
        //   items: { type: "object" },
        // },
      },
      //   required: ["personList", "assignmentList"],
    },
  },
};

// Map tool names to implementations
const availableFunctions = {
  //   getOptimizationParameters: async (_args: any) => {
  //     const personListCache = (await ManpowerControllerService.getAll()).map(
  //       (mp: Manpower, idx: number) => ({
  //         id: mp._id ? Number(mp._id) : idx + 1,
  //         name: mp.name,
  //         roles: mp.roles,
  //       })
  //     );
  //     const assignmentList = assignmentListCache;
  //     return { personListCache, assignmentList };
  //   },
  //   fetchAllManpower: async (_args: any) =>
  //     (await ManpowerControllerService.getAll()).map(
  //       (mp: Manpower, idx: number) => ({
  //         id: mp._id ? Number(mp._id) : idx + 1,
  //         name: mp.name,
  //         roles: mp.roles,
  //       })
  //     ),
  //   getAssignmentList: async (_args: any) => assignmentListCache,
  solveScheduler: async () => {
    const personList = (await ManpowerControllerService.getAll()).map(
      (mp: Manpower, idx: number) => ({
        id: mp._id ? Number(mp._id) : idx + 1,
        name: mp.name,
        roles: mp.roles,
      })
    );
    console.log(personList, assignmentListCache);
    const { assignmentList } = await EventAssignmentControllerService.solve({
      personList,
      assignmentList: assignmentListCache,
      constraintSettings: defaultConstraintSettings,
    });
    return { assignmentList };
  },
};

// LLM agent function
export async function optimizeSchedulerWithLLM(
  assignmentList: any[],
  messages: any[] = [
    {
      role: "system",
      content: `You are an LLM that forwards an optimization request to an OptaPlanner bacckend.  
        The input is already ready to be used in the OptaPlanner backend.
        Once you have called the solveScheduler function, you can return the result directly.
        Do not modify the result at all. The optimizer is way more powerful than you.
        Do not interpret the result, just return the output of the function call in JSON format.`,
    },
    {
      role: "user",
      content: "Please optimize my scheduler with the necessary manpower",
    },
  ],
  model = "qwen3:4b"
) {
  assignmentListCache = assignmentList;
  const response = await ollama.chat({
    model,
    messages,
    tools: [solveSchedulerTool],
  });

  // Log initial LLM response (chain of thought)
  console.log("LLM initial response:", response.message.content);

  if (response.message.tool_calls) {
    for (const tool of response.message.tool_calls) {
      const fnName = tool.function.name as keyof typeof availableFunctions;
      const functionToCall = availableFunctions[fnName];
      if (functionToCall) {
        console.log("Calling function:", tool.function.name);
        console.log("Arguments:", tool.function.arguments);
        if (fnName === "solveScheduler") {
          const { personList, assignmentList } = tool.function.arguments;
          const output = await functionToCall();

          messages.push(response.message);
          messages.push({
            role: "tool",
            content: JSON.stringify(output),
          });
          console.log("Function output:", output);

          // Log tool call and output
          console.log(`LLM called solveScheduler with:`, {
            personList,
            assignmentList,
          });
          console.log(`Tool output:`, output);

          return { output, messages };
        }
        // else if (
        //   fnName === "getOptimizationParameters"
        //   //   fnName === "getAssignmentList"
        // )
        // {
        //   const output = await functionToCall({});
        //   console.log("Function output:", output);

        //   messages.push(response.message);
        //   messages.push({
        //     role: "tool",
        //     content: JSON.stringify(output),
        //   });
        //   // Log tool call and output
        //   console.log(`LLM called fetchAllManpower`);
        //   console.log(`Tool output:`, output);
        //   console.log("Function output:", output);
        // }
        else {
          console.warn(
            `Function ${tool.function.name} not found in availableFunctions.`
          );
        }
      }
    }
    // Get final response from model with function outputs
    const finalResponse = await ollama.chat({
      model,
      messages,
      format: "json",
    });
    // Log final LLM response (chain of thought)
    // console.log("LLM final response:", finalResponse.message.content);
    return finalResponse.message.content;
  } else {
    // Log fallback LLM response
    // console.log("LLM fallback response:", response.message.content);
    return response.message.content;
  }
}
