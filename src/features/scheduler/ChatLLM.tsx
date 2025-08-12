import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { optimizeSchedulerWithLLMConstraints } from "../llm/ollamatoolSchedulerConstraints";
import { updateEventName } from "../../stores/event/eventSlice";
import type { RootState } from "../../stores/store";
import type { Assignment } from "../../api/optaplanner/models/Assignment";

const ChatLLM: React.FC = () => {
  const events = useSelector((state: RootState) => state.event);
  const resources = useSelector((state: RootState) => state.resource);
  const dispatch = useDispatch();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState(
    "Please optimize my scheduler. Ensure there are no back-to-back assignments and all constraints are respected. Try to balance the workload as much as possible."
  );
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    // Map events to assignmentList
    const assignmentList: Assignment[] = events.map((ev, idx) => ({
      id: idx + 1,
      event: {
        id: idx + 1,
        name: ev.name || `Event ${idx + 1}`,
        start: ev.startDate + ":00",
        end: ev.endDate + ":00",
        requiredRole: resources.find(
          (resource) => resource.id === ev.resourceId
        )?.name,
      },
    }));
    try {
      const llmResult = await optimizeSchedulerWithLLMConstraints(
        assignmentList,
        newMessages
      );
      console.log("LLM result:", llmResult);
      // Try to parse the LLM result and update Redux events if solution is present
      let solution: { assignmentList?: Assignment[] } = {};
      if (llmResult && typeof llmResult === "object") {
        if (
          "output" in llmResult &&
          llmResult.output &&
          typeof llmResult.output === "object"
        ) {
          solution = llmResult.output as { assignmentList?: Assignment[] };
        } else if ("assignmentList" in llmResult) {
          solution = llmResult as { assignmentList?: Assignment[] };
        }
      }
      if (solution && solution.assignmentList) {
        solution.assignmentList.forEach((assignment: Assignment) => {
          if (assignment.event?.id && assignment.person?.name) {
            const eventIdx = assignment.event.id - 1;
            if (events[eventIdx]) {
              dispatch(
                updateEventName({
                  id: events[eventIdx].id,
                  name: assignment.person.name,
                })
              );
            }
          }
        });
      }
      // Only show the LLM's final response (not chain of thought/tool call JSON)
      let llmMessage = "";
      if (llmResult && typeof llmResult === "object") {
        if (
          "output" in llmResult &&
          llmResult.output &&
          typeof llmResult.output === "object"
        ) {
          // Try to extract a user-friendly message or just show 'Optimization complete.'
          llmMessage = "Optimization complete.";
        } else if ("assignmentList" in llmResult) {
          llmMessage = "Optimization complete.";
        }
      }
      // If the LLM's last message has a <think>...</think> tag, only show the content after the tag
      let lastMsg: string | undefined = undefined;
      if (
        llmResult &&
        typeof llmResult === "object" &&
        "messages" in llmResult &&
        Array.isArray((llmResult as any).messages)
      ) {
        const msgs = (llmResult as any).messages;
        lastMsg = msgs[msgs.length - 1];
        if (typeof lastMsg === "string" && lastMsg.includes("</think>")) {
          const afterThink = lastMsg.split("</think>").pop()?.trim();
          if (afterThink) llmMessage = afterThink;
        }
      }
      setMessages([
        ...messages,
        {
          role: newMessages[newMessages.length - 1].role,
          content: newMessages[newMessages.length - 1].content,
          // .split("</think>")[1],
        },
        { role: "assistant", content: llmMessage },
      ]);
    } catch (e) {
      setMessages([
        ...messages,
        {
          role: newMessages[newMessages.length - 1].role,
          content: newMessages[newMessages.length - 1].content,
          // .split("</think>")[1],
        },
        { role: "assistant", content: `LLM optimization failed: ${e}` },
      ]);
    } finally {
      setInput("");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 0,
        width: 500,
        height: "100vh",
        bgcolor: "background.paper",
        borderLeft: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        zIndex: 1200,
      }}
    >
      <Typography
        variant="h6"
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
      >
        LLM Chat
      </Typography>
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {messages.map((msg, idx) => (
          <Paper
            key={idx}
            sx={{
              p: 1,
              mb: 1,
              fontSize: 18,
              bgcolor:
                msg.role === "user"
                  ? "#e3f2fd"
                  : msg.role === "assistant"
                  ? "#f3e5f5"
                  : "#eeeeee",
            }}
          >
            <b style={{ fontSize: 18 }}>
              {msg.role === "user"
                ? "You"
                : msg.role === "assistant"
                ? "LLM"
                : "System"}
              :
            </b>{" "}
            {msg.content}
          </Paper>
        ))}
      </Box>
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          gap: 1,
          alignItems: "center",
          minHeight: 64,
        }}
      >
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={6}
          maxRows={8}
          placeholder="Type your prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          sx={{ minWidth: 80 }}
        >
          Send
        </Button>
        {loading && <CircularProgress size={28} sx={{ ml: 1 }} />}
      </Box>
    </Box>
  );
};

export default ChatLLM;
