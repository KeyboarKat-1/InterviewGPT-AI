"""
Coding Interview Service
Handles AI-powered code review and complexity analysis using Gemini.
"""
import google.generativeai as genai
import json
import os

MODEL_NAME = "gemini-2.0-flash"


def review_code(code, language, problem_description=None):
    """
    Review submitted code using Gemini AI. Provides feedback, complexity analysis,
    and improvement suggestions.
    
    Args:
        code: The source code to review
        language: Programming language (Python, JavaScript, Java, C++)
        problem_description: Optional problem statement the code is solving
    
    Returns:
        dict with feedback, complexity analysis, score, and suggestions
    """
    model = genai.GenerativeModel(MODEL_NAME)
    
    problem_context = ""
    if problem_description:
        problem_context = f"\nProblem Statement:\n{problem_description}\n"
    
    review_prompt = f"""You are an expert coding interviewer and code reviewer at a top tech company.
Review the following {language} code submission and provide a detailed evaluation.
{problem_context}
Code ({language}):
```{language.lower()}
{code}
```

Provide your review in STRICT JSON format with NO additional text, markdown, or code blocks. Just raw JSON:
{{
    "score": <number 0-100>,
    "correctness": "<Correct/Partially Correct/Incorrect>",
    "feedback": "<detailed paragraph of feedback on the solution approach, logic, and implementation>",
    "timeComplexity": "<Big O notation, e.g., O(n), O(n log n)>",
    "spaceComplexity": "<Big O notation, e.g., O(1), O(n)>",
    "codeQuality": {{
        "readability": <number 0-100>,
        "efficiency": <number 0-100>,
        "bestPractices": <number 0-100>
    }},
    "suggestions": [
        "<improvement suggestion 1>",
        "<improvement suggestion 2>",
        "<improvement suggestion 3>"
    ],
    "optimizedApproach": "<brief description of a more optimal approach if applicable, or 'Current approach is optimal'>",
    "edgeCases": ["<edge case 1 to consider>", "<edge case 2>"]
}}

Be thorough but constructive. Focus on algorithmic thinking and code quality."""

    try:
        response = model.generate_content(review_prompt)
        response_text = response.text.strip()
        
        # Clean up markdown formatting
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        result["success"] = True
        return result
    except (json.JSONDecodeError, Exception) as e:
        return {
            "score": 60,
            "correctness": "Unable to evaluate",
            "feedback": "The code was received but could not be fully analyzed. Please ensure the code is syntactically valid and try again.",
            "timeComplexity": "Unable to determine",
            "spaceComplexity": "Unable to determine",
            "codeQuality": {
                "readability": 70,
                "efficiency": 65,
                "bestPractices": 65
            },
            "suggestions": [
                "Ensure your code handles edge cases",
                "Add comments to explain your approach",
                "Consider the time and space complexity of your solution"
            ],
            "optimizedApproach": "Please try submitting again for a detailed analysis",
            "edgeCases": ["Empty input", "Large input sizes"],
            "success": True,
            "fallback": True,
            "error": str(e)
        }


def generate_coding_problem(difficulty="Medium", topic=None):
    """
    Generate a coding interview problem using Gemini AI.
    
    Args:
        difficulty: Easy, Medium, or Hard
        topic: Optional specific topic (arrays, strings, trees, etc.)
    
    Returns:
        dict with problem title, description, examples, and constraints
    """
    model = genai.GenerativeModel(MODEL_NAME)
    
    topic_context = f" focused on {topic}" if topic else ""
    
    prompt = f"""Generate a {difficulty} difficulty coding interview problem{topic_context}.

Provide the problem in STRICT JSON format with NO additional text, markdown, or code blocks. Just raw JSON:
{{
    "title": "<problem title>",
    "description": "<clear problem description>",
    "examples": [
        {{
            "input": "<example input>",
            "output": "<expected output>",
            "explanation": "<brief explanation>"
        }},
        {{
            "input": "<example input 2>",
            "output": "<expected output 2>",
            "explanation": "<brief explanation>"
        }}
    ],
    "constraints": ["<constraint 1>", "<constraint 2>"],
    "hints": ["<hint 1>", "<hint 2>"],
    "difficulty": "{difficulty}",
    "tags": ["<tag1>", "<tag2>"]
}}

Make the problem original, clear, and well-structured. Include 2 examples with explanations."""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        result["success"] = True
        return result
    except (json.JSONDecodeError, Exception) as e:
        return {
            "title": "Two Sum",
            "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
            "examples": [
                {
                    "input": "nums = [2,7,11,15], target = 9",
                    "output": "[0,1]",
                    "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
                },
                {
                    "input": "nums = [3,2,4], target = 6",
                    "output": "[1,2]",
                    "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
                }
            ],
            "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
            "hints": ["Try using a hash map for O(n) time complexity"],
            "difficulty": difficulty,
            "tags": ["Array", "Hash Table"],
            "success": True,
            "fallback": True,
            "error": str(e)
        }
