"""
Curio Agent SDK Observability - Flask Backend
"""
import os
import sys
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add parent directory to path to import curio_agent_sdk
# Path: curio_agent_observability/backend/app.py -> personal_assistant/ -> find curio_agent_sdk
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from curio_agent_sdk.config.settings import AgentConfig
from curio_agent_sdk.persistence.base import BasePersistence

app = Flask(__name__)
CORS(app)

# Global persistence instance
_persistence: BasePersistence = None


def get_persistence() -> BasePersistence:
    """Get or create persistence instance."""
    global _persistence
    if _persistence is None:
        config = AgentConfig.from_env()
        _persistence = config.get_persistence()
    return _persistence


# ============== Health & Stats ==============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check API and database health."""
    try:
        persistence = get_persistence()
        db_healthy = persistence.health_check()
        return jsonify({
            'status': 'healthy' if db_healthy else 'degraded',
            'database': 'connected' if db_healthy else 'disconnected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_overall_stats():
    """Get overall statistics across all agents."""
    try:
        persistence = get_persistence()
        agent_id = request.args.get('agent_id')
        stats = persistence.get_agent_run_stats(agent_id=agent_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Agents ==============

@app.route('/api/agents', methods=['GET'])
def list_agents():
    """List all unique agents."""
    try:
        persistence = get_persistence()
        runs = persistence.get_agent_runs(limit=10000)

        # Extract unique agents with their stats
        agents_map = {}
        for run in runs:
            agent_id = run.agent_id
            if agent_id not in agents_map:
                agents_map[agent_id] = {
                    'agent_id': agent_id,
                    'agent_name': run.agent_name,
                    'total_runs': 0,
                    'completed_runs': 0,
                    'error_runs': 0,
                    'last_run': None
                }

            agents_map[agent_id]['total_runs'] += 1
            if run.status == 'completed':
                agents_map[agent_id]['completed_runs'] += 1
            elif run.status == 'error':
                agents_map[agent_id]['error_runs'] += 1

            # Track most recent run
            if run.started_at:
                current_last = agents_map[agent_id]['last_run']
                run_time = run.started_at.isoformat() if isinstance(run.started_at, datetime) else run.started_at
                if current_last is None or run_time > current_last:
                    agents_map[agent_id]['last_run'] = run_time

        agents_list = sorted(agents_map.values(), key=lambda x: x['last_run'] or '', reverse=True)
        return jsonify({'agents': agents_list, 'total': len(agents_list)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/agents/<agent_id>/stats', methods=['GET'])
def get_agent_stats(agent_id):
    """Get statistics for a specific agent."""
    try:
        persistence = get_persistence()
        stats = persistence.get_agent_run_stats(agent_id=agent_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Runs ==============

@app.route('/api/runs', methods=['GET'])
def list_runs():
    """List agent runs with pagination and filtering."""
    try:
        persistence = get_persistence()

        # Parse query params
        agent_id = request.args.get('agent_id')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        runs = persistence.get_agent_runs(agent_id=agent_id, limit=limit, offset=offset)

        # Filter by status if provided
        if status:
            runs = [r for r in runs if r.status == status]

        runs_data = []
        for run in runs:
            run_dict = run.to_dict()
            # Add summary fields
            run_dict['event_count'] = len(persistence.get_agent_run_events(run.run_id))
            llm_usage = persistence.get_llm_usage(run_id=run.run_id, limit=1000)
            run_dict['llm_call_count'] = len(llm_usage)
            run_dict['total_tokens'] = sum(u.get_total_tokens() for u in llm_usage)
            runs_data.append(run_dict)

        return jsonify({
            'runs': runs_data,
            'total': len(runs_data),
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/runs/<run_id>', methods=['GET'])
def get_run(run_id):
    """Get detailed information about a specific run."""
    try:
        persistence = get_persistence()
        run = persistence.get_agent_run(run_id)

        if not run:
            return jsonify({'error': 'Run not found'}), 404

        run_dict = run.to_dict()

        # Add events summary
        events = persistence.get_agent_run_events(run_id)
        run_dict['events'] = [e.to_dict() for e in events]
        run_dict['event_count'] = len(events)

        # Add LLM usage summary
        llm_usage = persistence.get_llm_usage(run_id=run_id, limit=1000)
        run_dict['llm_calls'] = [u.to_dict() for u in llm_usage]
        run_dict['llm_call_count'] = len(llm_usage)
        run_dict['total_input_tokens'] = sum(u.input_tokens or 0 for u in llm_usage)
        run_dict['total_output_tokens'] = sum(u.output_tokens or 0 for u in llm_usage)
        run_dict['total_tokens'] = run_dict['total_input_tokens'] + run_dict['total_output_tokens']
        run_dict['total_latency_ms'] = sum(u.latency_ms or 0 for u in llm_usage)

        return jsonify(run_dict)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/runs/<run_id>/events', methods=['GET'])
def get_run_events(run_id):
    """Get all events for a specific run."""
    try:
        persistence = get_persistence()
        event_type = request.args.get('event_type')

        events = persistence.get_agent_run_events(run_id, event_type=event_type)
        events_data = [e.to_dict() for e in events]

        return jsonify({
            'events': events_data,
            'total': len(events_data),
            'run_id': run_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/runs/<run_id>/llm-calls', methods=['GET'])
def get_run_llm_calls(run_id):
    """Get all LLM calls for a specific run."""
    try:
        persistence = get_persistence()
        limit = int(request.args.get('limit', 100))

        llm_usage = persistence.get_llm_usage(run_id=run_id, limit=limit)
        llm_data = [u.to_dict() for u in llm_usage]

        return jsonify({
            'llm_calls': llm_data,
            'total': len(llm_data),
            'run_id': run_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/runs/<run_id>/timeline', methods=['GET'])
def get_run_timeline(run_id):
    """Get a timeline view of a run combining events and LLM calls."""
    try:
        persistence = get_persistence()

        run = persistence.get_agent_run(run_id)
        if not run:
            return jsonify({'error': 'Run not found'}), 404

        events = persistence.get_agent_run_events(run_id)
        llm_usage = persistence.get_llm_usage(run_id=run_id, limit=1000)

        # Build timeline
        timeline = []

        for event in events:
            timeline.append({
                'type': 'event',
                'timestamp': event.timestamp.isoformat() if isinstance(event.timestamp, datetime) else event.timestamp,
                'event_type': event.event_type,
                'data': event.get_data_dict()
            })

        for llm_call in llm_usage:
            timeline.append({
                'type': 'llm_call',
                'timestamp': llm_call.created_at.isoformat() if isinstance(llm_call.created_at, datetime) else llm_call.created_at,
                'provider': llm_call.provider,
                'model': llm_call.model,
                'input_tokens': llm_call.input_tokens,
                'output_tokens': llm_call.output_tokens,
                'latency_ms': llm_call.latency_ms,
                'status': llm_call.status,
                'id': llm_call.id
            })

        # Sort by timestamp
        timeline.sort(key=lambda x: x['timestamp'] or '')

        return jsonify({
            'run_id': run_id,
            'agent_name': run.agent_name,
            'objective': run.objective,
            'status': run.status,
            'timeline': timeline
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== LLM Calls ==============

@app.route('/api/llm-calls', methods=['GET'])
def list_llm_calls():
    """List LLM calls with pagination and filtering."""
    try:
        persistence = get_persistence()

        agent_id = request.args.get('agent_id')
        run_id = request.args.get('run_id')
        provider = request.args.get('provider')
        model = request.args.get('model')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        llm_usage = persistence.get_llm_usage(
            agent_id=agent_id,
            run_id=run_id,
            limit=limit + offset  # Fetch extra for offset
        )

        # Apply additional filters
        if provider:
            llm_usage = [u for u in llm_usage if u.provider == provider]
        if model:
            llm_usage = [u for u in llm_usage if u.model == model]
        if status:
            llm_usage = [u for u in llm_usage if u.status == status]

        # Apply offset
        llm_usage = llm_usage[offset:offset + limit]

        llm_data = []
        for u in llm_usage:
            data = u.to_dict()
            # Truncate long fields for list view
            if data.get('prompt') and len(data['prompt']) > 200:
                data['prompt_preview'] = data['prompt'][:200] + '...'
            else:
                data['prompt_preview'] = data.get('prompt', '')
            if data.get('response_content') and len(data['response_content']) > 200:
                data['response_preview'] = data['response_content'][:200] + '...'
            else:
                data['response_preview'] = data.get('response_content', '')
            llm_data.append(data)

        return jsonify({
            'llm_calls': llm_data,
            'total': len(llm_data),
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm-calls/<int:call_id>', methods=['GET'])
def get_llm_call(call_id):
    """Get detailed information about a specific LLM call."""
    try:
        persistence = get_persistence()

        # Get all LLM calls and find the one with matching ID
        # This is a workaround since we don't have a direct get_by_id method
        all_usage = persistence.get_llm_usage(limit=10000)
        llm_call = next((u for u in all_usage if u.id == call_id), None)

        if not llm_call:
            return jsonify({'error': 'LLM call not found'}), 404

        return jsonify(llm_call.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm-calls/models', methods=['GET'])
def list_models():
    """List all unique provider/model combinations used."""
    try:
        persistence = get_persistence()
        llm_usage = persistence.get_llm_usage(limit=10000)

        models_map = {}
        for u in llm_usage:
            key = f"{u.provider}:{u.model}"
            if key not in models_map:
                models_map[key] = {
                    'provider': u.provider,
                    'model': u.model,
                    'call_count': 0,
                    'total_input_tokens': 0,
                    'total_output_tokens': 0,
                    'total_latency_ms': 0,
                    'error_count': 0
                }

            models_map[key]['call_count'] += 1
            models_map[key]['total_input_tokens'] += u.input_tokens or 0
            models_map[key]['total_output_tokens'] += u.output_tokens or 0
            models_map[key]['total_latency_ms'] += u.latency_ms or 0
            if u.status == 'error':
                models_map[key]['error_count'] += 1

        # Calculate averages
        for key in models_map:
            if models_map[key]['call_count'] > 0:
                models_map[key]['avg_latency_ms'] = round(
                    models_map[key]['total_latency_ms'] / models_map[key]['call_count']
                )

        models_list = sorted(models_map.values(), key=lambda x: x['call_count'], reverse=True)
        return jsonify({'models': models_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Events ==============

@app.route('/api/events', methods=['GET'])
def list_events():
    """List events with filtering."""
    try:
        persistence = get_persistence()

        run_id = request.args.get('run_id')
        event_type = request.args.get('event_type')
        limit = int(request.args.get('limit', 100))

        if not run_id:
            # Get events from recent runs
            runs = persistence.get_agent_runs(limit=10)
            all_events = []
            for run in runs:
                events = persistence.get_agent_run_events(run.run_id, event_type=event_type)
                all_events.extend(events)
            # Sort by timestamp descending
            all_events.sort(key=lambda x: x.timestamp or datetime.min, reverse=True)
            events = all_events[:limit]
        else:
            events = persistence.get_agent_run_events(run_id, event_type=event_type)

        return jsonify({
            'events': [e.to_dict() for e in events],
            'total': len(events)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/events/types', methods=['GET'])
def list_event_types():
    """List all unique event types."""
    try:
        persistence = get_persistence()
        runs = persistence.get_agent_runs(limit=100)

        event_types = set()
        for run in runs:
            events = persistence.get_agent_run_events(run.run_id)
            for event in events:
                event_types.add(event.event_type)

        return jsonify({'event_types': sorted(list(event_types))})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Search ==============

@app.route('/api/search', methods=['GET'])
def search():
    """Search across runs, events, and LLM calls."""
    try:
        persistence = get_persistence()
        query = request.args.get('q', '').lower()

        if not query:
            return jsonify({'error': 'Query parameter q is required'}), 400

        results = {
            'runs': [],
            'events': [],
            'llm_calls': []
        }

        # Search runs
        runs = persistence.get_agent_runs(limit=1000)
        for run in runs:
            if (query in (run.objective or '').lower() or
                query in (run.agent_name or '').lower() or
                query in (run.run_id or '').lower()):
                results['runs'].append({
                    'run_id': run.run_id,
                    'agent_name': run.agent_name,
                    'objective': run.objective,
                    'status': run.status
                })

        # Search LLM calls
        llm_usage = persistence.get_llm_usage(limit=1000)
        for u in llm_usage:
            if (query in (u.prompt or '').lower() or
                query in (u.response_content or '').lower()):
                results['llm_calls'].append({
                    'id': u.id,
                    'run_id': u.run_id,
                    'provider': u.provider,
                    'model': u.model,
                    'prompt_preview': (u.prompt or '')[:100] + '...' if u.prompt and len(u.prompt) > 100 else u.prompt
                })

        # Limit results
        results['runs'] = results['runs'][:20]
        results['llm_calls'] = results['llm_calls'][:20]

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('OBSERVABILITY_PORT', 5050))
    debug = os.environ.get('OBSERVABILITY_DEBUG', 'true').lower() == 'true'

    print(f"Starting Curio Agent SDK Observability API on port {port}")
    print(f"Debug mode: {debug}")

    app.run(host='0.0.0.0', port=port, debug=debug)
