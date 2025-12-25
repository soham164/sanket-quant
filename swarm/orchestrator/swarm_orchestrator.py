"""
Swarm Orchestrator (Rule-Based Multi-Agent Coordination)

Manages village agents and enables swarm intelligence through:
- Inter-agent communication (messages)
- Collective voting
- Network topology

NO LLM calls - pure rule-based coordination.
"""

from typing import Dict, List
import asyncio


class SwarmOrchestrator:
    """
    Orchestrator for coordinating village swarm agents.
    Uses simple message passing and voting - NO LLM.
    """
    
    def __init__(self, quantum_service=None):
        self.quantum_service = quantum_service
        self.agents: Dict[str, any] = {}
        
        # Network topology (which villages are neighbors)
        self.network_topology: Dict[str, List[str]] = {
            'v1': ['v2', 'v3'],        # Dharavi ↔ Kalyan, Thane
            'v2': ['v1', 'v3'],        # Kalyan ↔ Dharavi, Thane
            'v3': ['v1', 'v2', 'v4'],  # Thane ↔ all
            'v4': ['v3']               # Navi Mumbai ↔ Thane
        }
        
        self._initialize_swarm()
    
    def _initialize_swarm(self):
        """Create village agents."""
        from swarm.agents.village_adk_agent import create_village_agents
        
        self.agents = create_village_agents(
            orchestrator=self,
            quantum_service=self.quantum_service
        )
        
        print(f"✓ Swarm initialized: {len(self.agents)} rule-based agents")

    def _resolve_village_id(self, village_id: str) -> str:
        """Resolve village name to ID (accepts both 'Dharavi' and 'v1')."""
        if village_id in self.agents:
            return village_id
        
        # Match by name (case-insensitive)
        village_lower = village_id.lower().replace(' ', '_')
        for aid, agent in self.agents.items():
            if agent.village_name.lower().replace(' ', '_') == village_lower:
                return aid
            if agent.village_name.lower() == village_id.lower():
                return aid
        
        return None
    
    async def process_symptom_report(self, village_id: str, symptoms: List[str], metadata: Dict) -> Dict:
        """Process symptom report through the appropriate agent."""
        resolved_id = self._resolve_village_id(village_id)
        
        if not resolved_id:
            # Default to first agent
            resolved_id = list(self.agents.keys())[0] if self.agents else None
            if not resolved_id:
                raise ValueError("No agents available")
            print(f"⚠️ Village '{village_id}' not found, using: {resolved_id}")
        
        agent = self.agents[resolved_id]
        
        # Process through rule-based agent (NO LLM)
        result = await agent.process_symptom_report(symptoms, metadata)
        
        return {
            'village': agent.village_name,
            'agent_response': result,
            'autonomous_actions_taken': result.get('actions_taken', [])
        }
    
    async def query_agent(self, agent_id: str, query_type: str, context: Dict) -> Dict:
        """Query a specific agent."""
        resolved_id = self._resolve_village_id(agent_id)
        if not resolved_id:
            return {"error": f"Agent {agent_id} not found"}
        
        agent = self.agents[resolved_id]
        return await agent.receive_query(query_type, context)

    async def collect_votes(self, proposal: Dict, voters: List[str]) -> Dict:
        """Collect votes from agents using simple threshold logic."""
        votes = {}
        
        for voter_id in voters:
            resolved_id = self._resolve_village_id(voter_id)
            if resolved_id and resolved_id in self.agents:
                agent = self.agents[resolved_id]
                # Simple voting - no LLM needed
                votes[voter_id] = agent.vote_on_proposal(proposal)
        
        return votes
    
    def get_network_status(self) -> Dict:
        """Get status of entire swarm network."""
        return {
            'total_agents': len(self.agents),
            'network_topology': self.network_topology,
            'agents': {
                aid: {
                    'name': agent.village_name,
                    'location': agent.location,
                    'outbreak_belief': agent.outbreak_belief,
                    'risk_level': agent.risk_level,
                    'symptom_count': len(agent.symptom_history),
                    'neighbors': self.network_topology.get(aid, [])
                }
                for aid, agent in self.agents.items()
            }
        }
    
    def get_agent(self, village_id: str):
        """Get specific agent."""
        resolved_id = self._resolve_village_id(village_id)
        return self.agents.get(resolved_id) if resolved_id else None
    
    async def trigger_outbreak_detection_workflow(self, initiator_id: str) -> Dict:
        """
        Trigger outbreak detection across all agents.
        Uses collective voting - NO LLM.
        """
        resolved_id = self._resolve_village_id(initiator_id)
        if not resolved_id:
            return {"error": "Initiator not found"}
        
        # Gather beliefs from all agents
        beliefs = {}
        for aid, agent in self.agents.items():
            beliefs[aid] = {
                "village": agent.village_name,
                "belief": agent.outbreak_belief,
                "risk_level": agent.risk_level
            }
        
        # Calculate collective belief (simple average)
        avg_belief = sum(b["belief"] for b in beliefs.values()) / len(beliefs)
        
        # Determine if quantum escalation needed
        high_risk_count = sum(1 for b in beliefs.values() if b["belief"] >= 0.6)
        escalate = high_risk_count >= 2 or avg_belief >= 0.7
        
        result = {
            "initiator": initiator_id,
            "collective_belief": round(avg_belief, 3),
            "high_risk_villages": high_risk_count,
            "escalate_to_quantum": escalate,
            "village_beliefs": beliefs
        }
        
        # Trigger quantum if needed
        if escalate and self.quantum_service:
            quantum_result = await self.quantum_service.detect_outbreak_pattern(
                self.get_network_status()
            )
            result["quantum_analysis"] = quantum_result
        
        return result
