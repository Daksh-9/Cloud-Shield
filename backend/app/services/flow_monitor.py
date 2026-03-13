import time
import threading
from collections import defaultdict
from scapy.all import sniff, IP, TCP, UDP
from typing import Dict, Any, Callable

class FlowMonitor:
    def __init__(self, interface: str, flow_timeout: int = 15, on_flow_ready: Callable = None):
        """
        Initializes the network flow monitor.
        
        :param interface: The network interface to sniff on (e.g., 'Ethernet').
        :param flow_timeout: Seconds of inactivity before a flow is considered "complete".
        :param on_flow_ready: Callback function triggered when a flow is ready for ML parsing.
        """
        self.interface = interface
        self.flow_timeout = flow_timeout
        self.on_flow_ready = on_flow_ready
        
        # Dictionary to hold active flows. Key: 5-tuple, Value: Flow statistics
        self.active_flows: Dict[tuple, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.is_running = False

    def _packet_handler(self, packet):
        """Task 1: Captures packet headers and extracts metadata."""
        # We only care about IP packets
        if IP not in packet:
            return

        ip_layer = packet[IP]
        src_ip = ip_layer.src
        dst_ip = ip_layer.dst
        proto = ip_layer.proto
        packet_size = len(packet)

        src_port = 0
        dst_port = 0

        # Extract ports if TCP or UDP
        if TCP in packet:
            src_port = packet[TCP].sport
            dst_port = packet[TCP].dport
        elif UDP in packet:
            src_port = packet[UDP].sport
            dst_port = packet[UDP].dport

        # The 5-tuple uniquely identifies a unidirectional network flow
        flow_key = (src_ip, dst_ip, src_port, dst_port, proto)
        current_time = time.time()

        # Task 2: Aggregate the packet into a flow
        with self.lock:
            if flow_key not in self.active_flows:
                # Create a new flow record
                self.active_flows[flow_key] = {
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "protocol": proto,
                    "start_time": current_time,
                    "last_packet_time": current_time,
                    "packet_count": 1,
                    "total_bytes": packet_size
                }
            else:
                # Update existing flow record (reducing overhead)
                flow = self.active_flows[flow_key]
                flow["last_packet_time"] = current_time
                flow["packet_count"] += 1
                flow["total_bytes"] += packet_size

    def _flow_timeout_checker(self):
        """Background thread that checks for inactive flows and exports them."""
        while self.is_running:
            time.sleep(5)  # Check every 5 seconds
            current_time = time.time()
            flows_to_export = []

            with self.lock:
                # Find flows that haven't received a packet in 'flow_timeout' seconds
                expired_keys = [
                    key for key, flow in self.active_flows.items()
                    if (current_time - flow["last_packet_time"]) > self.flow_timeout
                ]

                # Extract and remove expired flows
                for key in expired_keys:
                    flow_data = self.active_flows.pop(key)
                    # Calculate final duration
                    flow_data["duration"] = flow_data["last_packet_time"] - flow_data["start_time"]
                    flows_to_export.append(flow_data)

            # Send completed flows to the ML Feature Extractor
            if self.on_flow_ready and flows_to_export:
                for flow in flows_to_export:
                    self.on_flow_ready(flow)

    def start(self):
        """Starts the packet sniffing and flow aggregation threads."""
        self.is_running = True
        
        # Start the background timeout checker
        threading.Thread(target=self._flow_timeout_checker, daemon=True).start()
        
        print(f"[*] Starting Flow Monitor on interface {self.interface}...")
        
        # Start sniffing packets. 'store=False' prevents RAM exhaustion during high traffic
        sniff(
            iface=self.interface,
            prn=self._packet_handler,
            store=False,
            stop_filter=lambda x: not self.is_running
        )

    def stop(self):
        """Stops the flow monitor."""
        self.is_running = False
        print("[*] Stopping Flow Monitor...")