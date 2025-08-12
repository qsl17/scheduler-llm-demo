// src/features/llm/ollamatoolSchedulerConstraints.ts
// LLM tool agent for adjusting constraint weights and solving the schedule
import { defaultConstraintSettings } from "./constraints";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { EventAssignmentControllerService } from "../../api/optaplanner/services/EventAssignmentControllerService";
import ollama from "ollama";

// --- Constraint reference (mutable) ---
const constraintSettings = { ...defaultConstraintSettings };

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

// --- LLM agent function ---
export async function optimizeSchedulerWithLLMConstraints(
  assignmentList: any[],
  messages: any[] = [
    {
      role: "system",
      content: `You are an LLM agent that can adjust constraint weights for scheduling optimization. 
      Use the provided tools to set constraint weights before solving. 
      Do not pass values as arguments, always use the tools to set the weights directly. 
      Assume default weights unless specified by the user.
      Only use the solveScheduler tool when all constraints are set. The solver will end the conversation and return the solution.`,
    },
    {
      role: "user",
      content:
        "Please optimize my scheduler. Ensure there are no back-to-back assignments and all constraints are respected. Try to balance the workload as much as possible.",
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
      solveSchedulerTool,
    ],
  });
  // ...handle tool calls and chain as in your main agent...

  console.log("LLM initial response:", response.message.content);

  if (response.message.tool_calls) {
    for (const tool of response.message.tool_calls) {
      const fnName = tool.function.name as keyof typeof availableFunctions;
      const functionToCall = availableFunctions[fnName];
      console.log("Calling function:", tool.function.name);
      console.log("Arguments:", tool.function.arguments);
      if (fnName === "solveScheduler") {
        const { personList, assignmentList } = tool.function.arguments;
        const output = await functionToCall({ value: "" });
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
      } else if (Object.keys(availableFunctions).includes(fnName)) {
        console.log("Calling function:", tool.function.name);
        console.log("Arguments:", tool.function.arguments);
        const output = functionToCall(
          tool.function.arguments as { value: string }
        );
        console.log("Function output:", output);

        // Add the function response to messages for the model to use
        messages.push(response.message);
        messages.push({
          role: "tool",
          content: output.toString(),
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
