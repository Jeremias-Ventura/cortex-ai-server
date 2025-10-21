const parseResponse = (response) => {
  const sections = [];
  
  // Define the section patterns with their HTML markers
  const sectionPatterns = [
    { start: '<!--EXPLANATION_START-->', end: '<!--EXPLANATION_END-->', type: 'explanation', title: 'Introduction' },
    { start: '<!--IDEA1_START-->', end: '<!--IDEA1_END-->', type: 'idea1', title: 'Idea 1' },
    { start: '<!--IDEA2_START-->', end: '<!--IDEA2_END-->', type: 'idea2', title: 'Idea 2' },
    { start: '<!--IDEA3_START-->', end: '<!--IDEA3_END-->', type: 'idea3', title: 'Idea 3' },
    { start: '<!--TOPIC_START-->', end: '<!--TOPIC_END-->', type: 'topic', title: 'Topic' },
    
    // Page 1 (Beginner Examples)
    { start: '<!--EXAMPLE1_HEADER_START-->', end: '<!--EXAMPLE1_HEADER_END-->', type: 'example1_header', title: 'Beginner Examples' },
    { start: '<!--EXAMPLE1_SBYS_START-->', end: '<!--EXAMPLE1_SBYS_END-->', type: 'example1_sbys', title: 'Step-by-Step' },
    { start: '<!--EXAMPLE1_EX1_START-->', end: '<!--EXAMPLE1_EX1_END-->', type: 'example1_ex1', title: 'Example 1' },
    { start: '<!--EXAMPLE1_EX1SUM_START-->', end: '<!--EXAMPLE1_EX1SUM_END-->', type: 'example1_ex1sum', title: 'Example 1 Summary' },
    { start: '<!--EXAMPLE1_EX2_START-->', end: '<!--EXAMPLE1_EX2_END-->', type: 'example1_ex2', title: 'Example 2' },
    { start: '<!--EXAMPLE1_EX2SUM_START-->', end: '<!--EXAMPLE1_EX2SUM_END-->', type: 'example1_ex2sum', title: 'Example 2 Summary' },
    { start: '<!--EXAMPLE1_EX3_START-->', end: '<!--EXAMPLE1_EX3_END-->', type: 'example1_ex3', title: 'Example 3' },
    { start: '<!--EXAMPLE1_EX3SUM_START-->', end: '<!--EXAMPLE1_EX3SUM_END-->', type: 'example1_ex3sum', title: 'Example 3 Summary' },
    { start: '<!--EXAMPLE1_CHECKPOINT_START-->', end: '<!--EXAMPLE1_CHECKPOINT_END-->', type: 'example1_checkpoint', title: 'Checkpoint 1' },
    { start: '<!--EXAMPLE1_ANSWER_START-->', end: '<!--EXAMPLE1_ANSWER_END-->', type: 'example1_answer', title: 'Answer 1' },
    
    // Page 2 (Mid-Level Examples)
    { start: '<!--EXAMPLE2_HEADER_START-->', end: '<!--EXAMPLE2_HEADER_END-->', type: 'example2_header', title: 'Mid-Level Examples' },
    { start: '<!--EXAMPLE2_SBYS_START-->', end: '<!--EXAMPLE2_SBYS_END-->', type: 'example2_sbys', title: 'Step-by-Step' },
    { start: '<!--EXAMPLE2_EX1_START-->', end: '<!--EXAMPLE2_EX1_END-->', type: 'example2_ex1', title: 'Example 1' },
    { start: '<!--EXAMPLE2_EX1SUM_START-->', end: '<!--EXAMPLE2_EX1SUM_END-->', type: 'example2_ex1sum', title: 'Example 1 Summary' },
    { start: '<!--EXAMPLE2_EX2_START-->', end: '<!--EXAMPLE2_EX2_END-->', type: 'example2_ex2', title: 'Example 2' },
    { start: '<!--EXAMPLE2_EX2SUM_START-->', end: '<!--EXAMPLE2_EX2SUM_END-->', type: 'example2_ex2sum', title: 'Example 2 Summary' },
    { start: '<!--EXAMPLE2_EX3_START-->', end: '<!--EXAMPLE2_EX3_END-->', type: 'example2_ex3', title: 'Example 3' },
    { start: '<!--EXAMPLE2_EX3SUM_START-->', end: '<!--EXAMPLE2_EX3SUM_END-->', type: 'example2_ex3sum', title: 'Example 3 Summary' },
    { start: '<!--EXAMPLE2_CHECKPOINT_START-->', end: '<!--EXAMPLE2_CHECKPOINT_END-->', type: 'example2_checkpoint', title: 'Checkpoint 2' },
    { start: '<!--EXAMPLE2_ANSWER_START-->', end: '<!--EXAMPLE2_ANSWER_END-->', type: 'example2_answer', title: 'Answer 2' },
    
    // Page 3 (Advanced Examples)
    { start: '<!--EXAMPLE3_HEADER_START-->', end: '<!--EXAMPLE3_HEADER_END-->', type: 'example3_header', title: 'Advanced Examples' },
    { start: '<!--EXAMPLE3_SBYS_START-->', end: '<!--EXAMPLE3_SBYS_END-->', type: 'example3_sbys', title: 'Step-by-Step' },
    { start: '<!--EXAMPLE3_EX1_START-->', end: '<!--EXAMPLE3_EX1_END-->', type: 'example3_ex1', title: 'Example 1' },
    { start: '<!--EXAMPLE3_EX1SUM_START-->', end: '<!--EXAMPLE3_EX1SUM_END-->', type: 'example3_ex1sum', title: 'Example 1 Summary' },
    { start: '<!--EXAMPLE3_EX2_START-->', end: '<!--EXAMPLE3_EX2_END-->', type: 'example3_ex2', title: 'Example 2' },
    { start: '<!--EXAMPLE3_EX2SUM_START-->', end: '<!--EXAMPLE3_EX2SUM_END-->', type: 'example3_ex2sum', title: 'Example 2 Summary' },
    { start: '<!--EXAMPLE3_EX3_START-->', end: '<!--EXAMPLE3_EX3_END-->', type: 'example3_ex3', title: 'Example 3' },
    { start: '<!--EXAMPLE3_EX3SUM_START-->', end: '<!--EXAMPLE3_EX3SUM_END-->', type: 'example3_ex3sum', title: 'Example 3 Summary' },
    { start: '<!--EXAMPLE3_CHECKPOINT_START-->', end: '<!--EXAMPLE3_CHECKPOINT_END-->', type: 'example3_checkpoint', title: 'Checkpoint 3' },
    { start: '<!--EXAMPLE3_ANSWER_START-->', end: '<!--EXAMPLE3_ANSWER_END-->', type: 'example3_answer', title: 'Answer 3' },
    
    // Page 4 (Practice)
    { start: '<!--PRACTICE_START-->', end: '<!--PRACTICE_END-->', type: 'practice', title: 'Practice Problem' },
    { start: '<!--HINT1_START-->', end: '<!--HINT1_END-->', type: 'hint1', title: 'Hint 1' },
    { start: '<!--HINT2_START-->', end: '<!--HINT2_END-->', type: 'hint2', title: 'Hint 2' },
    { start: '<!--HINT3_START-->', end: '<!--HINT3_END-->', type: 'hint3', title: 'Hint 3' },
    { start: '<!--SOLUTION_START-->', end: '<!--SOLUTION_END-->', type: 'solution', title: 'Solution' }
  ];
  
  // Parse each section based on HTML markers
  sectionPatterns.forEach((pattern, index) => {
    const startIndex = response.indexOf(pattern.start);
    const endIndex = response.indexOf(pattern.end);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const content = response
        .substring(startIndex + pattern.start.length, endIndex)
        .trim();
      
      if (content) {
        sections.push({
          type: pattern.type,
          content: content,
          title: pattern.title,
          sectionNumber: index
        });
      }
    }
  });
  
  return sections;
};

export default parseResponse;