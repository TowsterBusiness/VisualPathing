import type { AppNode, AppEdge } from '../store/useStore';
import type { 
  LogicNodeData, 
  StartNodeData, 
  MoveNodeData, 
  SplitNodeData,
  WhileNodeData,
  WaitNodeData,
  ActionNodeData,
} from '../types/nodes';

export type CodeLanguage = 'java' | 'kotlin';

interface GeneratedCode {
  language: CodeLanguage;
  code: string;
}

/**
 * Generate FTC OpMode code (Java or Kotlin) from the node graph
 */
export function generateCode(
  nodes: AppNode[],
  edges: AppEdge[],
  projectName: string,
  language: CodeLanguage = 'java'
): GeneratedCode {
  if (language === 'java') {
    return {
      language: 'java',
      code: generateJavaCode(nodes, edges, projectName),
    };
  } else {
    return {
      language: 'kotlin',
      code: generateKotlinCode(nodes, edges, projectName),
    };
  }
}

/**
 * Generate Java FTC OpMode code with Pedro Pathing
 */
function generateJavaCode(nodes: AppNode[], edges: AppEdge[], projectName: string): string {
  const className = projectName.replace(/\s+/g, '');
  
  // Build adjacency map
  const childMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (!childMap.has(edge.source)) {
      childMap.set(edge.source, []);
    }
    childMap.get(edge.source)!.push(edge.target);
  }

  // Find start node
  const startNode = nodes.find((n) => (n.data as LogicNodeData).type === 'start');
  if (!startNode) {
    return '// Error: No start node found';
  }

  // Collect all conditions and actions
  const conditions = new Set<string>();
  const actions = new Set<string>();
  
  for (const node of nodes) {
    const data = node.data as LogicNodeData;
    if (data.type === 'split' || data.type === 'while' || data.type === 'wait') {
      conditions.add((data as any).conditionFunctionName);
    }
    if (data.type === 'action') {
      actions.add((data as ActionNodeData).functionName);
    }
  }

  // Generate states
  let stateEnum = 'private enum State {\n';
  const states: string[] = [];
  
  function traverseAndCreateStates(nodeId: string, visited = new Set<string>()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    
    const stateName = `STATE_${nodeId.replace(/-/g, '_').toUpperCase()}`;
    states.push(stateName);
    
    const children = childMap.get(nodeId) || [];
    for (const child of children) {
      traverseAndCreateStates(child, visited);
    }
  }
  
  traverseAndCreateStates(startNode.id);
  stateEnum += states.map((s, i) => `    ${s}${i < states.length - 1 ? ',' : ''}`).join('\n');
  stateEnum += ',\n    IDLE\n}';

  // Generate path building code
  let pathBuilding = '';
  
  function generatePathForNode(
    nodeId: string,
    visited = new Set<string>(),
    indent = '        '
  ): string {
    if (visited.has(nodeId)) return '';
    visited.add(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return '';
    
    const data = node.data as LogicNodeData;
    let code = '';
    
    if (data.type === 'move') {
      const moveData = data as MoveNodeData;
      const controlPointsCode = moveData.controlPoints.length > 0
        ? moveData.controlPoints.map((cp) => 
            `\n${indent}    .addControlPoint(${cp.x}, ${cp.y})`
          ).join('')
        : '';
      
      code += `${indent}// ${moveData.label}\n`;
      code += `${indent}follower.pathBuilder()\n`;
      code += `${indent}    .addPath(new BezierLine(\n`;
      code += `${indent}        new Point(${moveData.targetPosition.x}, ${moveData.targetPosition.y}, Point.CARTESIAN)\n`;
      code += `${indent}    ))${controlPointsCode}\n`;
      code += `${indent}    .setLinearHeadingInterpolation(Math.toRadians(${moveData.targetHeading}))\n`;
      code += `${indent}    .build();\n\n`;
    }
    
    return code;
  }

  pathBuilding = generatePathForNode(startNode.id);

  // Generate state machine logic
  let stateMachine = '';
  
  function generateStateLogic(
    nodeId: string,
    visited = new Set<string>(),
    indent = '            '
  ): string {
    if (visited.has(nodeId)) return '';
    visited.add(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return '';
    
    const data = node.data as LogicNodeData;
    const stateName = `STATE_${nodeId.replace(/-/g, '_').toUpperCase()}`;
    const children = childMap.get(nodeId) || [];
    
    let code = `${indent}case ${stateName}:\n`;
    
    switch (data.type) {
      case 'start':
        code += `${indent}    // Start position: (${(data as StartNodeData).position.x}, ${(data as StartNodeData).position.y})\n`;
        code += `${indent}    // Heading: ${(data as StartNodeData).heading}°\n`;
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}    currentState = State.${nextState};\n`;
        } else {
          code += `${indent}    currentState = State.IDLE;\n`;
        }
        code += `${indent}    break;\n\n`;
        break;
        
      case 'move':
        code += `${indent}    // Move to (${(data as MoveNodeData).targetPosition.x}, ${(data as MoveNodeData).targetPosition.y})\n`;
        code += `${indent}    if (!follower.isBusy()) {\n`;
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}        currentState = State.${nextState};\n`;
        } else {
          code += `${indent}        currentState = State.IDLE;\n`;
        }
        code += `${indent}    }\n`;
        code += `${indent}    break;\n\n`;
        break;
        
      case 'split':
        code += `${indent}    if (${(data as SplitNodeData).conditionFunctionName}()) {\n`;
        if (children[0]) {
          const trueState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}        currentState = State.${trueState};\n`;
        }
        code += `${indent}    } else {\n`;
        if (children[1]) {
          const falseState = `STATE_${children[1].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}        currentState = State.${falseState};\n`;
        }
        code += `${indent}    }\n`;
        code += `${indent}    break;\n\n`;
        break;
        
      case 'while':
        const whileData = data as WhileNodeData;
        code += `${indent}    if (${whileData.conditionFunctionName}()) {\n`;
        if (children.length > 0) {
          const bodyState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}        currentState = State.${bodyState};\n`;
        }
        code += `${indent}    } else {\n`;
        code += `${indent}        currentState = State.IDLE;\n`;
        code += `${indent}    }\n`;
        code += `${indent}    break;\n\n`;
        break;
        
      case 'wait':
        code += `${indent}    if (${(data as WaitNodeData).conditionFunctionName}()) {\n`;
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}        currentState = State.${nextState};\n`;
        } else {
          code += `${indent}        currentState = State.IDLE;\n`;
        }
        code += `${indent}    }\n`;
        code += `${indent}    break;\n\n`;
        break;
        
      case 'action':
        code += `${indent}    ${(data as ActionNodeData).functionName}();\n`;
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}    currentState = State.${nextState};\n`;
        } else {
          code += `${indent}    currentState = State.IDLE;\n`;
        }
        code += `${indent}    break;\n\n`;
        break;
        
      case 'parallel':
        code += `${indent}    // Parallel execution of ${children.length} branches\n`;
        // Parallel node continues to first child branch (sequential execution)
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}    currentState = State.${nextState};\n`;
        } else {
          code += `${indent}    currentState = State.IDLE;\n`;
        }
        code += `${indent}    break;\n\n`;
        break;
        
      case 'merge':
        code += `${indent}    // Merge point\n`;
        if (children.length > 0) {
          const nextState = `STATE_${children[0].replace(/-/g, '_').toUpperCase()}`;
          code += `${indent}    currentState = State.${nextState};\n`;
        } else {
          code += `${indent}    currentState = State.IDLE;\n`;
        }
        code += `${indent}    break;\n\n`;
        break;
    }
    
    for (const child of children) {
      code += generateStateLogic(child, visited, indent);
    }
    
    return code;
  }

  stateMachine = generateStateLogic(startNode.id);

  // Build final code
  const startData = startNode.data as StartNodeData;
  
  return `package org.firstinspires.ftc.teamcode.opmodes;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import org.pedropathing.follower.Follower;
import org.pedropathing.localization.Pose;
import org.pedropathing.pathgen.BezierLine;
import org.pedropathing.pathgen.Point;

@Autonomous(name = "${projectName}")
public class ${className} extends LinearOpMode {

    private Follower follower;
    private State currentState;

    ${stateEnum}

    @Override
    public void runOpMode() throws InterruptedException {
        // Initialize Pedro Pathing
        follower = new Follower(hardwareMap);
        
        // Set start pose
        Pose startPose = new Pose(${startData.position.x}, ${startData.position.y}, Math.toRadians(${startData.heading}));
        follower.setStartingPose(startPose);

        // Build paths
        buildPaths();

        // Initialize state machine
        currentState = State.STATE_${startNode.id.replace(/-/g, '_').toUpperCase()};

        waitForStart();

        while (opModeIsActive() && !isStopRequested()) {
            // Update follower
            follower.update();

            // State machine
            switch (currentState) {
${stateMachine}                case IDLE:
                    // Auto complete
                    break;
            }

            // Telemetry
            telemetry.addData("State", currentState);
            telemetry.addData("X", follower.getPose().getX());
            telemetry.addData("Y", follower.getPose().getY());
            telemetry.addData("Heading", Math.toDegrees(follower.getPose().getHeading()));
            telemetry.update();
        }
    }

    private void buildPaths() {
${pathBuilding}    }

    // Condition functions
${Array.from(conditions).map(c => `    private boolean ${c}() {\n        // TODO: Implement condition\n        return false;\n    }`).join('\n\n')}

    // Action functions
${Array.from(actions).map(a => `    private void ${a}() {\n        // TODO: Implement action\n    }`).join('\n\n')}
}
`;
}

/**
 * Generate Kotlin code
 */
function generateKotlinCode(nodes: AppNode[], edges: AppEdge[], projectName: string): string {
  // Build adjacency map
  const childMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (!childMap.has(edge.source)) {
      childMap.set(edge.source, []);
    }
    childMap.get(edge.source)!.push(edge.target);
  }

  // Find start node
  const startNode = nodes.find((n) => (n.data as LogicNodeData).type === 'start');
  if (!startNode) {
    return '// Error: No start node found';
  }

  // Collect all conditions and actions
  const conditions = new Set<string>();
  const actions = new Set<string>();
  const stateNames = new Set<string>();
  
  for (const node of nodes) {
    const data = node.data as LogicNodeData;
    stateNames.add(node.id.toUpperCase().replace(/-/g, '_'));
    if (data.type === 'split' || data.type === 'while' || data.type === 'wait') {
      conditions.add((data as any).conditionFunctionName);
    }
    if (data.type === 'action') {
      actions.add((data as ActionNodeData).functionName);
    }
  }
  
  // Generate enum entries
  const enumEntries = Array.from(stateNames).map(name => `        ${name}`).join(',\n');

  // Generate state machine logic
  let stateMachine = '';
  
  function generateStateLogic(
    nodeId: string,
    visited = new Set<string>(),
    indent = '            '
  ): string {
    if (visited.has(nodeId)) return '';
    visited.add(nodeId);
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return '';
    
    const data = node.data as LogicNodeData;
    const stateName = `State.${nodeId.toUpperCase().replace(/-/g, '_')}`;
    const children = childMap.get(nodeId) || [];
    
    let code = `${indent}${stateName} -> {\n`;
    
    switch (data.type) {
      case 'start':
        code += `${indent}    // Start: (${(data as StartNodeData).position.x}, ${(data as StartNodeData).position.y}), ${(data as StartNodeData).heading}°\n`;
        if (children.length > 0) {
          code += `${indent}    currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}    currentState = State.IDLE\n`;
        }
        code += `${indent}}\n\n`;
        break;
        
      case 'move':
        const moveData = data as MoveNodeData;
        code += `${indent}    // Move to (${moveData.targetPosition.x}, ${moveData.targetPosition.y})\n`;
        code += `${indent}    moveToPosition(${moveData.targetPosition.x}.0, ${moveData.targetPosition.y}.0, ${moveData.targetHeading}.0)\n`;
        if (children.length > 0) {
          code += `${indent}    currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}    currentState = State.IDLE\n`;
        }
        code += `${indent}}\n\n`;
        break;
        
      case 'split':
        code += `${indent}    currentState = if (${(data as SplitNodeData).conditionFunctionName}()) {\n`;
        if (children[0]) {
          code += `${indent}        State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}        State.IDLE\n`;
        }
        code += `${indent}    } else {\n`;
        if (children[1]) {
          code += `${indent}        State.${children[1].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}        State.IDLE\n`;
        }
        code += `${indent}    }\n`;
        code += `${indent}}\n\n`;
        break;
        
      case 'while':
        code += `${indent}    currentState = if (${(data as WhileNodeData).conditionFunctionName}()) {\n`;
        if (children.length > 0) {
          code += `${indent}        State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}        State.IDLE\n`;
        }
        code += `${indent}    } else {\n`;
        code += `${indent}        State.IDLE\n`;
        code += `${indent}    }\n`;
        code += `${indent}}\n\n`;
        break;
        
      case 'wait':
        code += `${indent}    if (${(data as WaitNodeData).conditionFunctionName}()) {\n`;
        if (children.length > 0) {
          code += `${indent}        currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}        currentState = State.IDLE\n`;
        }
        code += `${indent}    }\n`;
        code += `${indent}}\n\n`;
        break;
        
      case 'action':
        code += `${indent}    ${(data as ActionNodeData).functionName}()\n`;
        if (children.length > 0) {
          code += `${indent}    currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}    currentState = State.IDLE\n`;
        }
        code += `${indent}}\n\n`;
        break;
        
      case 'parallel':
        code += `${indent}    // Parallel execution\n`;
        // Parallel node continues to first child branch (sequential execution)
        if (children.length > 0) {
          code += `${indent}    currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}    currentState = State.IDLE\n`;
        }
        code += `${indent}}\n\n`;
        break;
        
      case 'merge':
        code += `${indent}    // Merge point\n`;
        if (children.length > 0) {
          code += `${indent}    currentState = State.${children[0].toUpperCase().replace(/-/g, '_')}\n`;
        } else {
          code += `${indent}    currentState = State.IDLE\n`;
        }
        code += `${indent}}\n\n`;
        break;
    }
    
    for (const child of children) {
      code += generateStateLogic(child, visited, indent);
    }
    
    return code;
  }

  stateMachine = generateStateLogic(startNode.id);
  const startData = startNode.data as StartNodeData;

  return `package org.firstinspires.ftc.teamcode

import com.qualcomm.robotcore.eventloop.opmode.Autonomous
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode
import org.pedropathing.follower.Follower
import org.pedropathing.localization.Pose
import org.pedropathing.pathgen.BezierCurve
import org.pedropathing.pathgen.PathChain
import org.pedropathing.pathgen.Point

/**
 * ${projectName}
 * Generated from Visual Pathing
 */
@Autonomous(name = "${projectName}")
class ${projectName.replace(/\s+/g, '')} : LinearOpMode() {
    
    enum class State {
${enumEntries},
        IDLE
    }
    
    private lateinit var follower: Follower
    private var currentState = State.${startNode.id.toUpperCase().replace(/-/g, '_')}
    
    override fun runOpMode() {
        // Initialize Pedro Pathing follower
        follower = Follower(hardwareMap)
        follower.setStartingPose(Pose(${startData.position.x}.0, ${startData.position.y}.0, Math.toRadians(${startData.heading}.0)))
        
        waitForStart()
        
        if (isStopRequested) return
        
        // State machine loop
        while (opModeIsActive() && currentState != State.IDLE) {
            when (currentState) {
${stateMachine}                State.IDLE -> {
                    telemetry.addData("Status", "Program complete")
                    telemetry.update()
                }
            }
            
            // Update follower
            follower.update()
            
            // Telemetry
            telemetry.addData("Current State", currentState)
            telemetry.addData("X", follower.pose.x)
            telemetry.addData("Y", follower.pose.y)
            telemetry.addData("Heading", Math.toDegrees(follower.pose.heading))
            telemetry.update()
        }
    }
    
    // Movement function using Pedro Pathing
    private fun moveToPosition(x: Double, y: Double, heading: Double) {
        val targetPose = Pose(x, y, Math.toRadians(heading))
        
        follower.followPath(
            follower.pathBuilder()
                .addPath(
                    BezierCurve(
                        Point(follower.pose),
                        Point(targetPose)
                    )
                )
                .build()
        )
        
        // Wait until path is complete
        while (opModeIsActive() && follower.isBusy) {
            follower.update()
        }
    }
    
    // Condition functions
${Array.from(conditions).map(c => `    private fun ${c}(): Boolean {\n        // TODO: Implement condition\n        return false\n    }`).join('\n\n')}
${conditions.size > 0 ? '\n' : ''}    // Action functions
${Array.from(actions).map(a => `    private fun ${a}() {\n        // TODO: Implement action\n    }`).join('\n\n')}
}
`;
}
