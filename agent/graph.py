from dotenv import load_dotenv
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
load_dotenv()
from prompts import * 
from states import *
from langgraph.constants import END
from langgraph.graph import StateGraph

llm = ChatGroq(model="openai/gpt-oss-120b")



def planner_agent(state: dict) -> dict:
    """Converts user prompt into a structured Plan."""
    user_prompt = state["user_prompt"]
    resp = llm.with_structured_output(Plan).invoke(
        planner_prompt(user_prompt)
    )
    if resp is None:
        raise ValueError("Planner did not return a valid response.")
    return {"plan": resp}


def architect_agent(state: dict) -> dict:
    """Creates TaskPlan from Plan."""
    plan: Plan = state["plan"]
    resp = llm.with_structured_output(TaskPlan).invoke(
        architect_prompt(plan=plan.model_dump_json())
    )
    if resp is None:
        raise ValueError("Planner did not return a valid response.")

    resp.plan = plan
    print(resp.model_dump_json())
    return {"task_plan": resp} 
        

# print(resp)

graph = StateGraph(dict)

graph.add_node("planner", planner_agent)
graph.add_node("architect", architect_agent)

graph.add_edge("planner", "architect")
graph.set_entry_point("planner")

agent = graph.compile()

if __name__ == "__main__":
    user_prompt = "create a simple calculator web application"
    result = agent.invoke({"user_prompt" : user_prompt})
    print(result)
