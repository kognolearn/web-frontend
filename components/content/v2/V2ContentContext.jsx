"use client";

import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";

/**
 * @typedef {import('./types').V2ContentState} V2ContentState
 * @typedef {import('./types').V2SectionGradeState} V2SectionGradeState
 * @typedef {import('./types').V2ComponentGradeResult} V2ComponentGradeResult
 */

const V2ContentContext = createContext(null);

/** @type {V2ContentState} */
const initialState = {
  answers: {},           // { sectionId: { componentId: value } }
  sectionGrades: {},     // { sectionId: { status, grades, error, totalScore, maxScore } }
  sectionProgress: {},   // { sectionId: 'pristine' | 'dirty' | 'submitted' | 'graded' }
};

/**
 * @param {V2ContentState} state
 * @param {Object} action
 * @returns {V2ContentState}
 */
function reducer(state, action) {
  switch (action.type) {
    case 'SET_ANSWER': {
      const { sectionId, componentId, value } = action.payload;
      return {
        ...state,
        answers: {
          ...state.answers,
          [sectionId]: {
            ...state.answers[sectionId],
            [componentId]: value,
          },
        },
        sectionProgress: {
          ...state.sectionProgress,
          [sectionId]: 'dirty',
        },
      };
    }

    case 'SET_SECTION_GRADING': {
      const { sectionId } = action.payload;
      return {
        ...state,
        sectionGrades: {
          ...state.sectionGrades,
          [sectionId]: { status: 'grading', grades: null, error: null },
        },
        sectionProgress: {
          ...state.sectionProgress,
          [sectionId]: 'submitted',
        },
      };
    }

    case 'SET_SECTION_GRADED': {
      const { sectionId, grades, totalScore, maxScore } = action.payload;
      return {
        ...state,
        sectionGrades: {
          ...state.sectionGrades,
          [sectionId]: { status: 'graded', grades, error: null, totalScore, maxScore },
        },
        sectionProgress: {
          ...state.sectionProgress,
          [sectionId]: 'graded',
        },
      };
    }

    case 'SET_SECTION_ERROR': {
      const { sectionId, error } = action.payload;
      return {
        ...state,
        sectionGrades: {
          ...state.sectionGrades,
          [sectionId]: { status: 'error', grades: null, error },
        },
        sectionProgress: {
          ...state.sectionProgress,
          [sectionId]: 'dirty', // Allow retry
        },
      };
    }

    case 'RESET_SECTION': {
      const { sectionId } = action.payload;
      const { [sectionId]: _answers, ...restAnswers } = state.answers;
      const { [sectionId]: _grades, ...restGrades } = state.sectionGrades;
      const { [sectionId]: _progress, ...restProgress } = state.sectionProgress;
      return {
        answers: restAnswers,
        sectionGrades: restGrades,
        sectionProgress: restProgress,
      };
    }

    case 'RESET_ALL':
      return initialState;

    default:
      return state;
  }
}

/**
 * V2 Content Provider - manages state for answers, grades, and section progress
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object.<string, Object.<string, *>>} [props.initialAnswers] - Pre-filled answers
 */
export function V2ContentProvider({ children, initialAnswers = {} }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    answers: initialAnswers,
  });

  /**
   * Set answer for a component
   * @param {string} sectionId
   * @param {string} componentId
   * @param {*} value
   */
  const setAnswer = useCallback((sectionId, componentId, value) => {
    dispatch({ type: 'SET_ANSWER', payload: { sectionId, componentId, value } });
  }, []);

  /**
   * Mark section as grading in progress
   * @param {string} sectionId
   */
  const setSectionGrading = useCallback((sectionId) => {
    dispatch({ type: 'SET_SECTION_GRADING', payload: { sectionId } });
  }, []);

  /**
   * Set section as graded with results
   * @param {string} sectionId
   * @param {Object.<string, V2ComponentGradeResult>} grades
   * @param {number} totalScore
   * @param {number} maxScore
   */
  const setSectionGraded = useCallback((sectionId, grades, totalScore, maxScore) => {
    dispatch({ type: 'SET_SECTION_GRADED', payload: { sectionId, grades, totalScore, maxScore } });
  }, []);

  /**
   * Set section grading error
   * @param {string} sectionId
   * @param {string} error
   */
  const setSectionError = useCallback((sectionId, error) => {
    dispatch({ type: 'SET_SECTION_ERROR', payload: { sectionId, error } });
  }, []);

  /**
   * Reset a single section
   * @param {string} sectionId
   */
  const resetSection = useCallback((sectionId) => {
    dispatch({ type: 'RESET_SECTION', payload: { sectionId } });
  }, []);

  /**
   * Reset all state
   */
  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  /**
   * Get answer for a component
   * @param {string} sectionId
   * @param {string} componentId
   * @returns {*}
   */
  const getAnswer = useCallback((sectionId, componentId) => {
    return state.answers[sectionId]?.[componentId];
  }, [state.answers]);

  /**
   * Get all answers for a section
   * @param {string} sectionId
   * @returns {Object.<string, *>}
   */
  const getSectionAnswers = useCallback((sectionId) => {
    return state.answers[sectionId] || {};
  }, [state.answers]);

  /**
   * Get grade state for a section
   * @param {string} sectionId
   * @returns {V2SectionGradeState}
   */
  const getSectionGrade = useCallback((sectionId) => {
    return state.sectionGrades[sectionId] || { status: 'idle' };
  }, [state.sectionGrades]);

  /**
   * Get grade for a specific component
   * @param {string} sectionId
   * @param {string} componentId
   * @returns {V2ComponentGradeResult|undefined}
   */
  const getComponentGrade = useCallback((sectionId, componentId) => {
    return state.sectionGrades[sectionId]?.grades?.[componentId];
  }, [state.sectionGrades]);

  /**
   * Get progress for a section
   * @param {string} sectionId
   * @returns {import('./types').SectionProgress}
   */
  const getSectionProgress = useCallback((sectionId) => {
    return state.sectionProgress[sectionId] || 'pristine';
  }, [state.sectionProgress]);

  /**
   * Check if a section is unlocked (previous section completed if required)
   * @param {import('./types').V2Section} section
   * @param {import('./types').V2Section[]} allSections
   * @returns {boolean}
   */
  const isSectionUnlocked = useCallback((section, allSections) => {
    if (!section.requires_previous) return true;

    const sectionIndex = allSections.findIndex(s => s.id === section.id);
    if (sectionIndex === 0) return true;

    const previousSection = allSections[sectionIndex - 1];
    return state.sectionProgress[previousSection.id] === 'graded';
  }, [state.sectionProgress]);

  const value = useMemo(() => ({
    state,
    setAnswer,
    setSectionGrading,
    setSectionGraded,
    setSectionError,
    resetSection,
    resetAll,
    getAnswer,
    getSectionAnswers,
    getSectionGrade,
    getComponentGrade,
    getSectionProgress,
    isSectionUnlocked,
  }), [
    state,
    setAnswer,
    setSectionGrading,
    setSectionGraded,
    setSectionError,
    resetSection,
    resetAll,
    getAnswer,
    getSectionAnswers,
    getSectionGrade,
    getComponentGrade,
    getSectionProgress,
    isSectionUnlocked,
  ]);

  return (
    <V2ContentContext.Provider value={value}>
      {children}
    </V2ContentContext.Provider>
  );
}

/**
 * Hook to access V2 content context
 * @returns {ReturnType<typeof V2ContentProvider>['value']}
 */
export function useV2Content() {
  const context = useContext(V2ContentContext);
  if (!context) {
    throw new Error('useV2Content must be used within a V2ContentProvider');
  }
  return context;
}
