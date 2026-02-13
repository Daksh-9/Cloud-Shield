"""
Suricata rule validation utilities.
"""
import re
from typing import Tuple, List, Dict, Any, Optional


def validate_suricata_rule(rule_content: str) -> Tuple[bool, Optional[str], List[str]]:
    """
    Validate a Suricata rule.
    
    Returns:
        Tuple of (is_valid, error_message, warnings)
    """
    warnings = []
    rule = rule_content.strip()
    
    # Empty rule
    if not rule:
        return False, "Rule cannot be empty", warnings
    
    # Comment line (starts with #)
    if rule.startswith('#'):
        return True, None, warnings
    
    # Basic Suricata rule format: action protocol src_ip src_port direction dst_ip dst_port (options)
    # Example: alert tcp any any -> any any (msg:"Test"; sid:1000001;)
    
    # Check for basic structure
    parts = rule.split()
    if len(parts) < 7:
        return False, "Rule format invalid: too few parts", warnings
    
    # Check for action
    valid_actions = ['alert', 'pass', 'drop', 'reject', 'rejects', 'log']
    if parts[0] not in valid_actions:
        warnings.append(f"Unknown action '{parts[0]}', expected one of {valid_actions}")
    
    # Check for protocol
    valid_protocols = ['tcp', 'udp', 'icmp', 'ip', 'http', 'ftp', 'smtp', 'tls', 'ssh', 'dns', 'dcerpc', 'smb', 'any']
    if parts[1].lower() not in valid_protocols:
        warnings.append(f"Unknown protocol '{parts[1]}', expected one of {valid_protocols}")
    
    # Check for direction arrow
    if '->' not in rule and '<>' not in rule:
        return False, "Rule must contain direction arrow (-> or <>)", warnings
    
    # Check for options block (must be in parentheses)
    if '(' not in rule or ')' not in rule:
        warnings.append("Rule should contain options block in parentheses")
    
    # Check for SID (Signature ID) - recommended but not required
    if 'sid:' not in rule.lower():
        warnings.append("Rule should include a SID (sid:) for identification")
    
    # Check for message
    if 'msg:' not in rule.lower():
        warnings.append("Rule should include a message (msg:) for clarity")
    
    # Check for balanced parentheses
    if rule.count('(') != rule.count(')'):
        return False, "Unbalanced parentheses in rule", warnings
    
    # Check for balanced brackets
    if rule.count('[') != rule.count(']'):
        return False, "Unbalanced brackets in rule", warnings
    
    # Check for balanced braces
    if rule.count('{') != rule.count('}'):
        return False, "Unbalanced braces in rule", warnings
    
    return True, None, warnings


def extract_rule_metadata(rule_content: str) -> Dict[str, Any]:
    """Extract metadata from a Suricata rule."""
    metadata = {}
    rule_lower = rule_content.lower()
    
    # Extract SID
    sid_match = re.search(r'sid:\s*(\d+)', rule_lower)
    if sid_match:
        metadata['sid'] = int(sid_match.group(1))
    
    # Extract message
    msg_match = re.search(r'msg:\s*"([^"]+)"', rule_content)
    if msg_match:
        metadata['message'] = msg_match.group(1)
    
    # Extract revision
    rev_match = re.search(r'rev:\s*(\d+)', rule_lower)
    if rev_match:
        metadata['revision'] = int(rev_match.group(1))
    
    # Extract action
    action_match = re.match(r'^\s*(\w+)', rule_content)
    if action_match:
        metadata['action'] = action_match.group(1)
    
    # Extract protocol
    protocol_match = re.search(r'^\s*\w+\s+(\w+)', rule_content)
    if protocol_match:
        metadata['protocol'] = protocol_match.group(1)
    
    return metadata


def format_rule_for_file(rule_content: str, rule_name: str = None, rule_id: str = None) -> str:
    """Format a rule for writing to file with comment header."""
    lines = []
    
    # Add comment header
    if rule_name or rule_id:
        comment_parts = []
        if rule_name:
            comment_parts.append(f"Rule: {rule_name}")
        if rule_id:
            comment_parts.append(f"ID: {rule_id}")
        lines.append(f"# {' | '.join(comment_parts)}")
    
    # Add the rule
    lines.append(rule_content.strip())
    lines.append("")  # Empty line after rule
    
    return "\n".join(lines)
