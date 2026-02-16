import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { FieldPosition, MoveNodeData, StartNodeData, LogicNodeData } from '../../types/nodes';
import { sampleBezierPath } from '../../utils/bezier';
import './FieldCanvas.css';

/** FTC field is 144 x 144 inches */
const FIELD_SIZE = 144;
const ROBOT_SIZE = 18; // 18 inches (standard FTC robot)
const HIT_RADIUS = 14; // pixels — how close a click needs to be to grab a robot

/**
 * Convert field coordinates (inches) to canvas pixel coordinates.
 * Field origin is bottom-left in FTC convention, but we draw top-left.
 */
function fieldToCanvas(pos: FieldPosition, canvasSize: number): { x: number; y: number } {
  const scale = canvasSize / FIELD_SIZE;
  return {
    x: pos.x * scale,
    y: (FIELD_SIZE - pos.y) * scale, // flip Y
  };
}

/**
 * Convert canvas pixel coordinates back to field coordinates.
 */
function canvasToField(px: number, py: number, canvasSize: number): FieldPosition {
  const scale = canvasSize / FIELD_SIZE;
  return {
    x: Math.round((px / scale) * 10) / 10,
    y: Math.round(((canvasSize - py) / scale) * 10) / 10,
  };
}

/** Clamp a field position to valid bounds */
function clampField(pos: FieldPosition): FieldPosition {
  return {
    x: Math.max(0, Math.min(FIELD_SIZE, pos.x)),
    y: Math.max(0, Math.min(FIELD_SIZE, pos.y)),
  };
}

/**
 * Get the resolved end position of a node for path chaining.
 */
function getNodeEndPosition(
  nodeData: LogicNodeData,
  parentEndPos: FieldPosition | null,
): FieldPosition | null {
  if (nodeData.type === 'start') {
    return (nodeData as StartNodeData).position;
  }
  if (nodeData.type === 'move') {
    return (nodeData as MoveNodeData).targetPosition;
  }
  // Non-movement nodes pass through the position
  return parentEndPos;
}

/** Info about a draggable handle on the field */
interface DragHandle {
  nodeId: string;
  kind: 'start-pos' | 'move-target' | 'control-point';
  fieldPos: FieldPosition;
  controlPointIndex?: number; // for kind === 'control-point'
}

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldImageRef = useRef<HTMLImageElement | null>(null);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);
  const fieldImageUrl = useStore((s) => s.fieldImageUrl);

  const robotState = useSimulationStore((s) => s.robotState);
  const isPlaying = useSimulationStore((s) => s.isPlaying);

  const [dragging, setDragging] = useState<DragHandle | null>(null);
  const dragHandlesRef = useRef<DragHandle[]>([]);
  const canvasSizeRef = useRef<number>(0);

  // Load field background image
  useEffect(() => {
    if (!fieldImageUrl) {
      fieldImageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      fieldImageRef.current = img;
      drawField();
    };
    img.src = fieldImageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldImageUrl]);

  /** Build all draggable handles for hit-testing */
  const buildDragHandles = useCallback(
    (resolvedPositions: Map<string, FieldPosition>): DragHandle[] => {
      const handles: DragHandle[] = [];
      const childToParent = new Map<string, string>();
      for (const edge of edges) {
        childToParent.set(edge.target, edge.source);
      }

      for (const node of nodes) {
        const data = node.data as LogicNodeData;
        if (data.type === 'start') {
          handles.push({
            nodeId: node.id,
            kind: 'start-pos',
            fieldPos: (data as StartNodeData).position,
          });
        }
        if (data.type === 'move') {
          const moveData = data as MoveNodeData;
          handles.push({
            nodeId: node.id,
            kind: 'move-target',
            fieldPos: moveData.targetPosition,
          });

          // If selected, also add control point handles
          if (node.id === selectedNodeId && moveData.controlPoints.length > 0) {
            let startPos: FieldPosition | null = null;
            if (moveData.ambiguousStart && moveData.overrideStartPosition) {
              startPos = moveData.overrideStartPosition;
            } else {
              const parentId = childToParent.get(node.id);
              if (parentId) startPos = resolvedPositions.get(parentId) ?? null;
            }
            
            // Add handles for each control point
            // Control points are distributed between start and end
            if (startPos) {
              const endPos = moveData.targetPosition;
              const numCP = moveData.controlPoints.length;
              
              for (let i = 0; i < numCP; i++) {
                const cp = moveData.controlPoints[i];
                // Interpolate anchor position for this control point
                const t = (i + 1) / (numCP + 1);
                const anchorX = startPos.x * (1 - t) + endPos.x * t;
                const anchorY = startPos.y * (1 - t) + endPos.y * t;
                
                handles.push({
                  nodeId: node.id,
                  kind: 'control-point',
                  controlPointIndex: i,
                  fieldPos: {
                    x: anchorX + cp.x,
                    y: anchorY + cp.y,
                  },
                });
              }
            }
          }
        }
      }
      return handles;
    },
    [nodes, edges, selectedNodeId],
  );

  const drawField = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const size = Math.min(container.clientWidth, container.clientHeight);
    if (size <= 0) return;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvasSizeRef.current = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const canvasSize = size;
    const scale = canvasSize / FIELD_SIZE;

    // Background image or solid color
    if (fieldImageRef.current) {
      ctx.drawImage(fieldImageRef.current, 0, 0, canvasSize, canvasSize);
      // Slight overlay for visibility
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    }

    // Grid
    drawGrid(ctx, canvasSize, scale);

    // Draw field border
    ctx.strokeStyle = '#585b70';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasSize - 2, canvasSize - 2);

    // Build adjacency for path resolution
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const childToParent = new Map<string, string>();
    for (const edge of edges) {
      childToParent.set(edge.target, edge.source);
    }

    // Resolve start positions for each node
    const resolvedPositions = new Map<string, FieldPosition>();

    function resolvePosition(nodeId: string): FieldPosition | null {
      if (resolvedPositions.has(nodeId)) return resolvedPositions.get(nodeId)!;

      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const data = node.data as LogicNodeData;
      if (data.type === 'start') {
        const pos = (data as StartNodeData).position;
        resolvedPositions.set(nodeId, pos);
        return pos;
      }

      // Get parent position
      const parentId = childToParent.get(nodeId);
      const parentEnd = parentId ? resolvePosition(parentId) : null;

      const endPos = getNodeEndPosition(data, parentEnd);
      if (endPos) resolvedPositions.set(nodeId, endPos);
      return endPos;
    }

    // Resolve all positions
    for (const node of nodes) {
      resolvePosition(node.id);
    }

    // Draw paths for move nodes
    for (const node of nodes) {
      const data = node.data as LogicNodeData;
      if (data.type !== 'move') continue;

      const moveData = data as MoveNodeData;
      let startPos: FieldPosition | null = null;

      if (moveData.ambiguousStart && moveData.overrideStartPosition) {
        startPos = moveData.overrideStartPosition;
      } else {
        const parentId = childToParent.get(node.id);
        if (parentId) startPos = resolvedPositions.get(parentId) ?? null;
      }

      if (!startPos) continue;

      const endPos = moveData.targetPosition;
      
      // Build all bezier points: start, control points (absolute), end
      const allPoints: FieldPosition[] = [startPos];
      const numCP = moveData.controlPoints.length;
      
      for (let i = 0; i < numCP; i++) {
        const cp = moveData.controlPoints[i];
        // Control point is relative to interpolated anchor
        const t = (i + 1) / (numCP + 1);
        const anchorX = startPos.x * (1 - t) + endPos.x * t;
        const anchorY = startPos.y * (1 - t) + endPos.y * t;
        allPoints.push({ x: anchorX + cp.x, y: anchorY + cp.y });
      }
      
      allPoints.push(endPos);

      const isSelected = node.id === selectedNodeId;
      drawBezierPath(ctx, allPoints, canvasSize, isSelected);

      // Draw control point guides for selected node
      if (isSelected) {
        drawControlPoints(ctx, startPos, endPos, allPoints, canvasSize);
      }
    }

    // Draw robots at key positions
    for (const node of nodes) {
      const data = node.data as LogicNodeData;
      if (data.type === 'start') {
        const startData = data as StartNodeData;
        const isSelected = node.id === selectedNodeId;
        drawRobot(ctx, startData.position, startData.heading, canvasSize, scale, isSelected, '#a6e3a1');
      }
    }

    for (const node of nodes) {
      const data = node.data as LogicNodeData;
      if (data.type === 'move') {
        const moveData = data as MoveNodeData;
        const isSelected = node.id === selectedNodeId;
        drawRobot(ctx, moveData.targetPosition, moveData.targetHeading, canvasSize, scale, isSelected, '#89b4fa');
      }
    }

    // Draw animated simulation robot
    if (robotState) {
      drawSimRobot(ctx, robotState.position, robotState.heading, canvasSize, scale);
    }

    // Update drag handles
    dragHandlesRef.current = buildDragHandles(resolvedPositions);
  }, [nodes, edges, selectedNodeId, buildDragHandles, robotState]);

  useEffect(() => {
    drawField();
    const onResize = () => drawField();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawField]);

  // Re-draw on every animation frame while playing
  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    const loop = () => {
      drawField();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, drawField]);

  // --- Mouse interaction for dragging robots on the field ---

  const getCanvasXY = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / window.devicePixelRatio / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / window.devicePixelRatio / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasXY(e);
    if (!pt) return;
    const canvasSize = canvasSizeRef.current;

    // Find closest drag handle
    let closest: DragHandle | null = null;
    let closestDist = Infinity;
    for (const handle of dragHandlesRef.current) {
      const cp = fieldToCanvas(handle.fieldPos, canvasSize);
      const dx = cp.x - pt.x;
      const dy = cp.y - pt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HIT_RADIUS && dist < closestDist) {
        closestDist = dist;
        closest = handle;
      }
    }

    if (closest) {
      setDragging(closest);
      setSelectedNodeId(closest.nodeId);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) {
      // Update cursor
      const pt = getCanvasXY(e);
      const canvas = canvasRef.current;
      if (!pt || !canvas) return;
      const canvasSize = canvasSizeRef.current;
      let isOverHandle = false;
      for (const handle of dragHandlesRef.current) {
        const cp = fieldToCanvas(handle.fieldPos, canvasSize);
        const dx = cp.x - pt.x;
        const dy = cp.y - pt.y;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) {
          isOverHandle = true;
          break;
        }
      }
      canvas.style.cursor = isOverHandle ? 'grab' : 'crosshair';
      return;
    }

    const pt = getCanvasXY(e);
    if (!pt) return;
    const canvasSize = canvasSizeRef.current;
    const fieldPos = clampField(canvasToField(pt.x, pt.y, canvasSize));

    applyDrag(dragging, fieldPos);
  };

  const handleMouseUp = () => {
    if (dragging) setDragging(null);
  };

  /** Apply a drag to the store */
  const applyDrag = (handle: DragHandle, fieldPos: FieldPosition) => {
    const node = nodes.find((n) => n.id === handle.nodeId);
    if (!node) return;
    const data = node.data as LogicNodeData;

    if (handle.kind === 'start-pos' && data.type === 'start') {
      updateNodeData(handle.nodeId, {
        position: fieldPos,
      } as Partial<StartNodeData>);
    } else if (handle.kind === 'move-target' && data.type === 'move') {
      updateNodeData(handle.nodeId, {
        targetPosition: fieldPos,
      } as Partial<MoveNodeData>);
    } else if (handle.kind === 'control-point' && data.type === 'move' && handle.controlPointIndex !== undefined) {
      const moveData = data as MoveNodeData;
      const cpIndex = handle.controlPointIndex;
      
      // Find start position
      const childToParent = new Map<string, string>();
      for (const edge of edges) {
        childToParent.set(edge.target, edge.source);
      }
      let startPos: FieldPosition = { x: 72, y: 72 };
      if (moveData.ambiguousStart && moveData.overrideStartPosition) {
        startPos = moveData.overrideStartPosition;
      } else {
        const parentId = childToParent.get(handle.nodeId);
        if (parentId) {
          const parentNode = nodes.find((n) => n.id === parentId);
          if (parentNode) {
            const pd = parentNode.data as LogicNodeData;
            if (pd.type === 'start') startPos = (pd as StartNodeData).position;
            else if (pd.type === 'move') startPos = (pd as MoveNodeData).targetPosition;
          }
        }
      }
      
      const endPos = moveData.targetPosition;
      const numCP = moveData.controlPoints.length;
      const t = (cpIndex + 1) / (numCP + 1);
      const anchorX = startPos.x * (1 - t) + endPos.x * t;
      const anchorY = startPos.y * (1 - t) + endPos.y * t;
      
      const newControlPoints = [...moveData.controlPoints];
      newControlPoints[cpIndex] = {
        x: Math.round((fieldPos.x - anchorX) * 10) / 10,
        y: Math.round((fieldPos.y - anchorY) * 10) / 10,
      };
      
      updateNodeData(handle.nodeId, {
        controlPoints: newControlPoints,
      } as Partial<MoveNodeData>);
    }
  };

  return (
    <div className="field-canvas-container" ref={containerRef}>
      <div className="field-label">FTC Field (144&quot; &times; 144&quot;)</div>
      <canvas
        ref={canvasRef}
        className="field-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="field-axis-labels">
        <span className="axis-x">X (inches)</span>
        <span className="axis-y">Y (inches)</span>
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, canvasSize: number, scale: number) {
  const gridSpacing = 24; // 24 inches = 2 feet per tile

  ctx.strokeStyle = '#2a2a40';
  ctx.lineWidth = 1;

  for (let i = 0; i <= FIELD_SIZE; i += gridSpacing) {
    const pos = i * scale;

    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvasSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvasSize, pos);
    ctx.stroke();
  }

  // Draw coordinate labels
  ctx.fillStyle = '#6c7086';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i <= FIELD_SIZE; i += gridSpacing) {
    const xPos = i * scale;
    ctx.fillText(`${i}`, xPos, canvasSize - 4);

    const yPos = (FIELD_SIZE - i) * scale;
    ctx.textAlign = 'left';
    ctx.fillText(`${i}`, 4, yPos - 2);
    ctx.textAlign = 'center';
  }
}

function drawBezierPath(
  ctx: CanvasRenderingContext2D,
  points: FieldPosition[],
  canvasSize: number,
  isSelected: boolean,
) {
  if (points.length < 2) return;
  
  const sampledPoints = sampleBezierPath(points, 50);
  const canvasPoints = sampledPoints.map(p => fieldToCanvas(p, canvasSize));

  // Glow effect for selected
  if (isSelected) {
    ctx.save();
    ctx.shadowColor = '#89b4fa';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#89b4fa';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
    for (let i = 1; i < canvasPoints.length; i++) {
      ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Main path
  ctx.strokeStyle = isSelected ? '#89b4fa' : '#74c7ec';
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
  for (let i = 1; i < canvasPoints.length; i++) {
    ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
  }
  ctx.stroke();

  // Arrow at end
  if (points.length >= 2) {
    drawArrow(ctx, points[points.length - 2], points[points.length - 1], canvasSize, isSelected ? '#89b4fa' : '#74c7ec');
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: FieldPosition,
  to: FieldPosition,
  canvasSize: number,
  color: string,
) {
  const f = fieldToCanvas(from, canvasSize);
  const t = fieldToCanvas(to, canvasSize);
  const angle = Math.atan2(t.y - f.y, t.x - f.x);
  const arrowLen = 10;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(
    t.x - arrowLen * Math.cos(angle - Math.PI / 6),
    t.y - arrowLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    t.x - arrowLen * Math.cos(angle + Math.PI / 6),
    t.y - arrowLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function drawControlPoints(
  ctx: CanvasRenderingContext2D,
  _start: FieldPosition,
  _end: FieldPosition,
  allPoints: FieldPosition[],
  canvasSize: number,
) {
  if (allPoints.length <= 2) return; // No control points
  
  const controlPoints = allPoints.slice(1, -1); // Exclude start and end

  ctx.setLineDash([]);

  // Control point dots
  for (const pt of controlPoints) {
    const cp = fieldToCanvas(pt, canvasSize);
    ctx.fillStyle = '#f9e2af';
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  pos: FieldPosition,
  heading: number,
  canvasSize: number,
  scale: number,
  isSelected: boolean,
  color: string,
) {
  const center = fieldToCanvas(pos, canvasSize);
  const robotPixelSize = ROBOT_SIZE * scale;
  const half = robotPixelSize / 2;
  const angle = (-heading * Math.PI) / 180; // convert to radians, flip for canvas

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  // Glow
  if (isSelected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
  }

  // Robot body
  ctx.fillStyle = color + '40'; // transparent
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fillRect(-half, -half, robotPixelSize, robotPixelSize);
  ctx.strokeRect(-half, -half, robotPixelSize, robotPixelSize);

  // Direction indicator (front of robot)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(half - 2, -4);
  ctx.lineTo(half + 6, 0);
  ctx.lineTo(half - 2, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw the simulation ghost robot — a pulsing, highlighted overlay.
 */
function drawSimRobot(
  ctx: CanvasRenderingContext2D,
  pos: FieldPosition,
  heading: number,
  canvasSize: number,
  scale: number,
) {
  const center = fieldToCanvas(pos, canvasSize);
  const robotPixelSize = ROBOT_SIZE * scale;
  const half = robotPixelSize / 2;
  const angle = (-heading * Math.PI) / 180;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);

  // Glow
  ctx.shadowColor = '#f38ba8';
  ctx.shadowBlur = 20;

  // Robot body — bright overlay
  ctx.fillStyle = '#f38ba860';
  ctx.strokeStyle = '#f38ba8';
  ctx.lineWidth = 2.5;
  ctx.fillRect(-half, -half, robotPixelSize, robotPixelSize);
  ctx.strokeRect(-half, -half, robotPixelSize, robotPixelSize);

  // Front arrow
  ctx.fillStyle = '#f38ba8';
  ctx.beginPath();
  ctx.moveTo(half - 2, -5);
  ctx.lineTo(half + 8, 0);
  ctx.lineTo(half - 2, 5);
  ctx.closePath();
  ctx.fill();

  // Crosshair dot
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Trail dot (no rotation)
  ctx.fillStyle = '#f38ba840';
  ctx.beginPath();
  ctx.arc(center.x, center.y, 2, 0, Math.PI * 2);
  ctx.fill();
}
