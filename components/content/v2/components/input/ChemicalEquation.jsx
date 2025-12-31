"use client";

import React, { useState, useCallback } from "react";

/**
 * ChemicalEquation - Coefficient inputs for balancing chemical equations
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Object} [props.value] - Current value { reactant_coefficients, product_coefficients }
 * @param {Function} [props.onChange] - Value change handler
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {Object} [props.grade] - Grade result
 * @param {boolean} [props.isGraded] - Whether section is graded
 * @param {boolean} [props.isGradable] - Whether this component is gradable
 * @param {Array<{formula: string, coefficient_editable: boolean, initial_coefficient: number}>} props.reactants
 * @param {Array<{formula: string, coefficient_editable: boolean, initial_coefficient: number}>} props.products
 * @param {boolean} [props.show_state_symbols] - Show state symbols (s), (l), (g), (aq)
 */
export default function ChemicalEquation({
  id,
  value,
  onChange,
  disabled = false,
  grade,
  isGraded = false,
  isGradable = false,
  reactants = [],
  products = [],
  show_state_symbols = false,
}) {
  const [reactantCoeffs, setReactantCoeffs] = useState(
    value?.reactant_coefficients ||
      reactants.map((r) => r.initial_coefficient || 1)
  );
  const [productCoeffs, setProductCoeffs] = useState(
    value?.product_coefficients ||
      products.map((p) => p.initial_coefficient || 1)
  );

  const handleReactantChange = useCallback((index, newValue) => {
    const coeff = parseInt(newValue) || 1;
    const newCoeffs = [...reactantCoeffs];
    newCoeffs[index] = Math.max(1, coeff);
    setReactantCoeffs(newCoeffs);
    onChange?.({
      reactant_coefficients: newCoeffs,
      product_coefficients: productCoeffs,
    });
  }, [reactantCoeffs, productCoeffs, onChange]);

  const handleProductChange = useCallback((index, newValue) => {
    const coeff = parseInt(newValue) || 1;
    const newCoeffs = [...productCoeffs];
    newCoeffs[index] = Math.max(1, coeff);
    setProductCoeffs(newCoeffs);
    onChange?.({
      reactant_coefficients: reactantCoeffs,
      product_coefficients: newCoeffs,
    });
  }, [reactantCoeffs, productCoeffs, onChange]);

  // Render chemical formula with subscripts
  const renderFormula = (formula) => {
    // Convert numbers to subscripts: H2O -> H₂O
    const parts = formula.split(/(\d+)/);
    return parts.map((part, i) => {
      if (/^\d+$/.test(part)) {
        return <sub key={i}>{part}</sub>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Determine border color based on grade
  let borderClass = "border-[var(--border)]";
  if (isGraded && grade) {
    if (grade.status === "correct" || grade.passed) {
      borderClass = "border-emerald-500";
    } else if (grade.status === "incorrect" || grade.passed === false) {
      borderClass = "border-rose-500";
    }
  }

  const renderCompound = (compound, index, coefficients, setCoefficient, side) => {
    const coeff = coefficients[index];
    const isEditable = compound.coefficient_editable;

    return (
      <div key={index} className="flex items-center gap-1">
        {/* Coefficient */}
        {isEditable ? (
          <input
            type="number"
            min="1"
            value={coeff}
            onChange={(e) => setCoefficient(index, e.target.value)}
            disabled={disabled || isGraded}
            className={`
              w-12 px-2 py-1 text-center text-lg font-semibold
              rounded-lg border ${borderClass}
              bg-[var(--surface-2)] text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        ) : (
          <span className="w-8 text-center text-lg font-semibold text-[var(--foreground)]">
            {coeff > 1 ? coeff : ""}
          </span>
        )}

        {/* Formula */}
        <span className="text-lg font-medium text-[var(--foreground)]">
          {renderFormula(compound.formula)}
        </span>
      </div>
    );
  };

  return (
    <div id={id} className="v2-chemical-equation">
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        {/* Reactants */}
        <div className="flex flex-wrap items-center gap-2">
          {reactants.map((compound, index) => (
            <React.Fragment key={`reactant-${index}`}>
              {index > 0 && (
                <span className="text-lg font-medium text-[var(--muted-foreground)]">+</span>
              )}
              {renderCompound(
                compound,
                index,
                reactantCoeffs,
                handleReactantChange,
                "reactant"
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Arrow */}
        <span className="text-2xl text-[var(--foreground)] mx-2">→</span>

        {/* Products */}
        <div className="flex flex-wrap items-center gap-2">
          {products.map((compound, index) => (
            <React.Fragment key={`product-${index}`}>
              {index > 0 && (
                <span className="text-lg font-medium text-[var(--muted-foreground)]">+</span>
              )}
              {renderCompound(
                compound,
                index,
                productCoeffs,
                handleProductChange,
                "product"
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Help text */}
      {!isGraded && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Enter coefficients to balance the equation
        </p>
      )}

      {/* Grade feedback */}
      {isGraded && grade?.feedback && (
        <p className={`mt-2 text-sm ${
          grade.status === "correct" || grade.passed
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}>
          {grade.feedback}
        </p>
      )}
    </div>
  );
}
