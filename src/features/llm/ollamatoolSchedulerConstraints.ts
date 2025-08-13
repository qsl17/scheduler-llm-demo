// src/features/llm/ollamatoolSchedulerConstraints.ts
// LLM tool agent for adjusting constraint weights and solving the schedule
import { defaultConstraintSettings } from "./constraints";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { EventAssignmentControllerService } from "../../api/optaplanner/services/EventAssignmentControllerService";
import ollama from "ollama";
import { EventAssignmentSolution } from "../../api/optaplanner/models/EventAssignmentSolution";

// --- Constraint reference (mutable) ---
const constraintSettings: {
  roleMatchWeight: { hard: number; soft: number };
  noOverlapWeight: { hard: number; soft: number };
  noBackToBackWeight: { hard: number; soft: number };
  balanceWeight: { hard: number; soft: number };
  affinityGroupOverlapWeight: { hard: number; soft: number };
  aversionGroupOverlapWeight: { hard: number; soft: number };
} = {
  roleMatchWeight: { hard: 10, soft: 0 },
  noOverlapWeight: { hard: 1, soft: 0 },
  noBackToBackWeight: { hard: 0, soft: 0 },
  balanceWeight: { hard: 0, soft: 0 },
  affinityGroupOverlapWeight: { hard: 0, soft: 0 },
  aversionGroupOverlapWeight: { hard: 0, soft: 0 },
};

// Utility to convert to 'Xhard/Ysoft' string format
function toStringWeights(settings: typeof constraintSettings) {
  return Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, `${v.hard}hard/${v.soft}soft`])
  );
}

// --- Split tools: hard and soft for each constraint ---
function makeHardTool(name: string, desc: string) {
  return {
    type: "function",
    function: {
      name: `set${name}HardWeight`,
      description: `Set the hard weight for ${desc} (integer 0-1)`,
      parameters: {
        type: "object",
        properties: {
          hard: { type: "integer", description: "Hard weight (0-1)" },
        },
        required: ["hard"],
      },
    },
  };
}
function makeSoftTool(name: string, desc: string) {
  return {
    type: "function",
    function: {
      name: `set${name}SoftWeight`,
      description: `Set the soft weight for ${desc} (integer 0-1)`,
      parameters: {
        type: "object",
        properties: {
          soft: { type: "integer", description: "Soft weight (0-1)" },
        },
        required: ["soft"],
      },
    },
  };
}

// const setRoleMatchHardWeightTool = makeHardTool(
//   "RoleMatch",
//   "role matching constraint"
// );
// const setRoleMatchSoftWeightTool = makeSoftTool(
//   "RoleMatch",
//   "role matching constraint"
// );
const setNoOverlapHardWeightTool = makeHardTool(
  "NoOverlap",
  "no-overlap constraint"
);
const setNoOverlapSoftWeightTool = makeSoftTool(
  "NoOverlap",
  "no-overlap constraint"
);
const setNoBackToBackHardWeightTool = makeHardTool(
  "NoBackToBack",
  "no-back-to-back constraint"
);
const setNoBackToBackSoftWeightTool = makeSoftTool(
  "NoBackToBack",
  "no-back-to-back constraint"
);
// const setBalanceHardWeightTool = makeHardTool("Balance", "balance constraint");
const setBalanceSoftWeightTool = makeSoftTool("Balance", "balance constraint");
const setAffinityGroupOverlapHardWeightTool = makeHardTool(
  "AffinityGroupOverlap",
  "affinity group overlap constraint"
);
const setAffinityGroupOverlapSoftWeightTool = makeSoftTool(
  "AffinityGroupOverlap",
  "affinity group overlap constraint"
);
const setAversionGroupOverlapHardWeightTool = makeHardTool(
  "AversionGroupOverlap",
  "aversion group overlap constraint"
);
const setAversionGroupOverlapSoftWeightTool = makeSoftTool(
  "AversionGroupOverlap",
  "aversion group overlap constraint"
);

const solveSchedulerTool = {
  type: "function",
  function: {
    name: "solveScheduler",
    description:
      "Solve the event assignment problem using the OptaPlanner solver API with current constraint settings.",
    parameters: {
      type: "object",
    },
  },
};

// const getConstraintWeightsTool = {
//   type: "function",
//   function: {
//     name: "constraintWeights",
//     description: "Gets the current constraint weights for the scheduler.",
//     parameters: {
//       type: "object",
//     },
//   },
// };

// --- Tool implementations ---
const availableFunctions = {
  setRoleMatchHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.roleMatchWeight.hard = hard;
    return JSON.stringify({
      roleMatchWeight: constraintSettings.roleMatchWeight,
    });
  },
  setRoleMatchSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.roleMatchWeight.soft = soft;
    return JSON.stringify({
      roleMatchWeight: constraintSettings.roleMatchWeight,
    });
  },
  setNoOverlapHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.noOverlapWeight.hard = hard;
    return JSON.stringify({
      noOverlapWeight: constraintSettings.noOverlapWeight,
    });
  },
  setNoOverlapSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.noOverlapWeight.soft = soft;
    return JSON.stringify({
      noOverlapWeight: constraintSettings.noOverlapWeight,
    });
  },
  setNoBackToBackHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.noBackToBackWeight.hard = hard;
    return JSON.stringify({
      noBackToBackWeight: constraintSettings.noBackToBackWeight,
    });
  },
  setNoBackToBackSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.noBackToBackWeight.soft = soft;
    return JSON.stringify({
      noBackToBackWeight: constraintSettings.noBackToBackWeight,
    });
  },
  setBalanceHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.balanceWeight.hard = hard;
    return JSON.stringify({ balanceWeight: constraintSettings.balanceWeight });
  },
  setBalanceSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.balanceWeight.soft = soft;
    return JSON.stringify({ balanceWeight: constraintSettings.balanceWeight });
  },
  setAffinityGroupOverlapHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.affinityGroupOverlapWeight.hard = hard;
    return JSON.stringify({
      affinityGroupOverlapWeight: constraintSettings.affinityGroupOverlapWeight,
    });
  },
  setAffinityGroupOverlapSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.affinityGroupOverlapWeight.soft = soft;
    return JSON.stringify({
      affinityGroupOverlapWeight: constraintSettings.affinityGroupOverlapWeight,
    });
  },
  setAversionGroupOverlapHardWeight: ({ hard }: { hard: number }) => {
    constraintSettings.aversionGroupOverlapWeight.hard = hard;
    return JSON.stringify({
      aversionGroupOverlapWeight: constraintSettings.aversionGroupOverlapWeight,
    });
  },
  setAversionGroupOverlapSoftWeight: ({ soft }: { soft: number }) => {
    constraintSettings.aversionGroupOverlapWeight.soft = soft;
    return JSON.stringify({
      aversionGroupOverlapWeight: constraintSettings.aversionGroupOverlapWeight,
    });
  },
  solveScheduler: async (_args?: any) => {
    const manpower = await ManpowerControllerService.getAll();
    const personList = manpower.map((mp: any, idx: number) => ({
      _id: mp._id ? Number(mp._id) : idx + 1,
      name: mp.name,
      roles: mp.roles,
    }));
    // assignmentListCache is set before calling this function
    const assignmentList = assignmentListCache;
    console.log(personList, assignmentList);
    const result = await EventAssignmentControllerService.solve({
      personList,
      assignmentList,
      constraintSettings: toStringWeights(constraintSettings),
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
      //   content: `You are an LLM agent that can adjust constraint weights for scheduling optimization.
      //   Use the provided tools to set constraint weights before solving.
      //   Do not pass values as arguments, always use the tools to set the weights directly.
      //   Weights are strictly in the format 'Xhard/Ysoft' where X and Y are integers.
      //   Assume default weights unless specified by the user.
      //   Only use the solveScheduler tool when all constraints are set. The solver will end the conversation and return the solution.
      //   Share instead on the constraints that you have set to match their requirements.
      //   Use point form to share the constraints that you have set.`,
      content: `You are an LLM agent that can adjust constraint weights for scheduling optimization.
        The user is not a technical user and expects you to set the weights based on their requirements.
        They will not understand the idea of weights, so you must explain it in simple terms.
        Use the provided tools to set constraint weights before solving.
        Do not pass values as arguments, always use the tools to set the weights directly.
        Weights are strictly in the format 'Xhard/Ysoft' where X and Y are integers. X and Y can range from 0 to 1.
        The higher the number, the more important the constraint when assessed by the solver.
        Carefully consider if the user is asking for a hard constraint (must be met) or a soft constraint (prefer to meet) and set the weights accordingly.
        If the user doesnt specify a type of constraint, assume the default settings. These have already been set in place. 
        Do not change them unless the user specifies otherwise. Focus only on the type of constraints that the user specifies.
        Err on the side of caution and prefer soft constraints unless the user explicitly asks for a hard constraint.
        Never set a constraint to be both hard and soft at the same time.
        Once finished setting the weights, you MUST use the solveScheduler tool or else the user will not see any changes to the scheduler.
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
      // setRoleMatchHardWeightTool,
      // setRoleMatchSoftWeightTool,
      setNoOverlapHardWeightTool,
      setNoOverlapSoftWeightTool,
      setNoBackToBackHardWeightTool,
      setNoBackToBackSoftWeightTool,
      // setBalanceHardWeightTool,
      setBalanceSoftWeightTool,
      setAffinityGroupOverlapHardWeightTool,
      setAffinityGroupOverlapSoftWeightTool,
      setAversionGroupOverlapHardWeightTool,
      setAversionGroupOverlapSoftWeightTool,
      solveSchedulerTool,
      // getConstraintWeightsTool,
    ],
  });
  // ...handle tool calls and chain as in your main agent...

  console.log("LLM initial response:", response.message.content);
  messages.push(response.message);
  if (response.message.tool_calls && response.message.tool_calls.length > 0) {
    if (
      response.message.tool_calls[response.message.tool_calls.length - 1]
        .function.name !== "solveScheduler"
    ) {
      response.message.tool_calls.push({
        function: {
          name: "solveScheduler",
          arguments: [],
        },
      });
    }
  }
  console.log("LLM tool calls:", response.message.tool_calls);

  if (response.message.tool_calls) {
    for (const tool of response.message.tool_calls) {
      const fnName = tool.function.name as keyof typeof availableFunctions;
      const functionToCall = availableFunctions[fnName];
      if (!functionToCall) {
        console.warn(
          `Function ${tool.function.name} not found in availableFunctions.`
        );
        continue;
      }
      console.log("Calling function:", tool.function.name);
      console.log("Arguments:", tool.function.arguments);
      if (fnName === "solveScheduler") {
        output = (await functionToCall({})) as EventAssignmentSolution;
        messages.push({
          role: "tool",
          content: JSON.stringify(output),
        });
        // Log tool call and output
        console.log(`LLM called solveScheduler`);
        console.log(`Tool output:`, output);

        const finalResponse = await ollama.chat({
          model,
          messages: messages.slice(0, 2).concat([
            {
              role: "system",
              content: `You have successfully solved the scheduler.
             Inform the user that you have completed the tasks to match their request.
             Do not interpret the result as you do not not understand the solver's output.
             Share instead on the constraints that you have set to match their requirements.
             Use point form to share the constraints that you have set.
             The user is not a technical user and expects an explanation of the constraints you have considered in simple terms.`,
            },
          ]),
        });
        messages.push(finalResponse.message);
        return { output, messages };
      } else {
        const toolOutput = functionToCall(tool.function.arguments);
        console.log("Function output:", toolOutput);
        messages.push({
          role: "tool",
          content: toolOutput.toString(),
        });
      }
    }
  }
  return response;
}
