// src/features/llm/ollamatoolSchedulerConstraints.ts
// LLM tool agent for adjusting constraint weights and solving the schedule
import { defaultConstraintSettings } from "./constraints";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { EventAssignmentControllerService } from "../../api/optaplanner/services/EventAssignmentControllerService";
import ollama from "ollama";
import { EventAssignmentSolution } from "../../api/optaplanner/models/EventAssignmentSolution";

// --- Constraint reference (mutable) ---
const constraintSettings: {
  roleMatchWeight: string;
  noOverlapWeight: string;
  noBackToBackWeight: string;
  balanceWeight: string;
  affinityGroupOverlapWeight?: string;
  aversionGroupOverlapWeight?: string;
} = { ...defaultConstraintSettings };

// --- Tool definitions ---
const setRoleMatchWeightTool = {
  type: "function",
  function: {
    name: "setRoleMatchWeight",
    description:
      "Set the weight for role matching constraint (e.g. '1hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '1hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const setNoOverlapWeightTool = {
  type: "function",
  function: {
    name: "setNoOverlapWeight",
    description:
      "Set the weight for no-overlap constraint (e.g. '1hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '1hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const setNoBackToBackWeightTool = {
  type: "function",
  function: {
    name: "setNoBackToBackWeight",
    description:
      "Set the weight for no-back-to-back constraint (e.g. '0hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '0hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const setBalanceWeightTool = {
  type: "function",
  function: {
    name: "setBalanceWeight",
    description: "Set the weight for balance constraint (e.g. '0hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '0hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const setAffinityGroupOverlapWeightTool = {
  type: "function",
  function: {
    name: "setAffinityGroupOverlapWeight",
    description:
      "Set the weight for affinity group overlap constraint (e.g. '0hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '0hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const setAversionGroupOverlapWeightTool = {
  type: "function",
  function: {
    name: "setAversionGroupOverlapWeight",
    description:
      "Set the weight for aversion group overlap constraint (e.g. '0hard/0soft')",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The new weight value (e.g. '0hard/0soft')",
        },
      },
      required: ["value"],
    },
  },
};

const solveSchedulerTool = {
  type: "function",
  function: {
    name: "solveScheduler",
    description:
      "Solve the event assignment problem using the OptaPlanner solver API with current constraint settings.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

// --- Tool implementations ---
const availableFunctions = {
  setRoleMatchWeight: ({ value }: { value: string }) => {
    constraintSettings.roleMatchWeight = value;
    return { roleMatchWeight: constraintSettings.roleMatchWeight };
  },
  setNoOverlapWeight: ({ value }: { value: string }) => {
    constraintSettings.noOverlapWeight = value;
    return { noOverlapWeight: constraintSettings.noOverlapWeight };
  },
  setNoBackToBackWeight: ({ value }: { value: string }) => {
    constraintSettings.noBackToBackWeight = value;
    return { noBackToBackWeight: constraintSettings.noBackToBackWeight };
  },
  setBalanceWeight: ({ value }: { value: string }) => {
    constraintSettings.balanceWeight = value;
    return { balanceWeight: constraintSettings.balanceWeight };
  },
  setAffinityGroupOverlapWeight: ({ value }: { value: string }) => {
    constraintSettings.affinityGroupOverlapWeight = value;
    return {
      affinityGroupOverlapWeight: constraintSettings.affinityGroupOverlapWeight,
    };
  },
  setAversionGroupOverlapWeight: ({ value }: { value: string }) => {
    constraintSettings.aversionGroupOverlapWeight = value;
    return {
      aversionGroupOverlapWeight: constraintSettings.aversionGroupOverlapWeight,
    };
  },
  solveScheduler: async () => {
    const manpower = await ManpowerControllerService.getAll();
    const personList = manpower.map((mp: any, idx: number) => ({
      id: mp._id ? Number(mp._id) : idx + 1,
      name: mp.name,
      roles: mp.roles,
    }));
    // assignmentListCache is set before calling this function
    const assignmentList = assignmentListCache;
    const result = await EventAssignmentControllerService.solve({
      personList,
      assignmentList,
      constraintSettings: { ...constraintSettings },
    });
    return result;
  },
};

// --- Assignment list reference (module-level, not globalThis) ---
let assignmentListCache: any[] = [];
let output: EventAssignmentSolution;

// --- LLM agent function ---
export async function optimizeSchedulerWithLLMConstraints(
  assignmentList: any[],
  messages: any[] = [
    {
      role: "system",
      content: `You are an LLM agent that can adjust constraint weights for scheduling optimization. 
      Use the provided tools to set constraint weights before solving. 
      Do not pass values as arguments, always use the tools to set the weights directly.
      Weights are strictly in the format 'Xhard/Ysoft' where X and Y are integers. 
      Assume default weights unless specified by the user.
      Only use the solveScheduler tool when all constraints are set. The solver will end the conversation and return the solution.
      Share instead on the constraints that you have set to match their requirements.
      Use point form to share the constraints that you have set.`,
    },
  ],
  model = "qwen3:8b"
) {
  // Set assignmentListCache at module level
  assignmentListCache = assignmentList;
  const response = await ollama.chat({
    model,
    messages,
    tools: [
      setRoleMatchWeightTool,
      setNoOverlapWeightTool,
      setNoBackToBackWeightTool,
      setBalanceWeightTool,
      setAffinityGroupOverlapWeightTool,
      setAversionGroupOverlapWeightTool,
      solveSchedulerTool,
    ],
  });
  // ...handle tool calls and chain as in your main agent...

  console.log("LLM initial response:", response.message.content);
  console.log("LLM tool calls:", response.message.tool_calls);
  messages.push(response.message);

  if (response.message.tool_calls) {
    let calledSolve = false;
    for (const tool of response.message.tool_calls) {
      const fnName = tool.function.name as keyof typeof availableFunctions;
      const functionToCall = availableFunctions[fnName];
      console.log("Calling function:", tool.function.name);
      console.log("Arguments:", tool.function.arguments);
      if (fnName === "solveScheduler") {
        const { personList, assignmentList } = tool.function.arguments;
        output = (await functionToCall({
          value: "",
        })) as EventAssignmentSolution;
        messages.push({
          role: "tool",
          content: JSON.stringify(output),
        });
        // Log tool call and output
        console.log(`LLM called solveScheduler with:`, {
          personList,
          assignmentList,
        });
        console.log(`Tool output:`, output);

        // messages.push({
        //   role: "system",
        //   content: `You have successfully solved the scheduler.
        //      Inform the user that you have completed the tasks to match their request.
        //      Do not interpret the result as you do not not understand the solver's output.
        //      Share instead on the constraints that you have set to match their requirements.
        //      Use point form to share the constraints that you have set.`,
        // });
        // const finalResponse = await ollama.chat({
        //   model,
        //   messages,
        // });
        // messages.push(finalResponse.message);
        return { output, messages };
      } else if (Object.keys(availableFunctions).includes(fnName)) {
        const toolOutput = functionToCall(
          tool.function.arguments as { value: string }
        );
        console.log("Function output:", toolOutput);
        messages.push({
          role: "tool",
          content: toolOutput.toString(),
        });
      } else {
        console.warn(
          `Function ${tool.function.name} not found in availableFunctions.`
        );
      }
    }
  }
  return response;
}
