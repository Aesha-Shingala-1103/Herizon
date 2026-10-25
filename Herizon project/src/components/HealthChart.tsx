import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import Colors from '../theme/colors';
import Typography from '../theme/typography';

interface DataPoint {
  date: string; // e.g. "Oct 12" or "10/12"
  value: number;
  secondaryValue?: number; // e.g. Diastolic for BP
  label?: string;
}

interface HealthChartProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  referenceLineMin?: number;
  referenceLineMax?: number;
  referenceLabel?: string;
  chartType?: 'line' | 'bar' | 'dual_line';
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const HealthChart: React.FC<HealthChartProps> = ({
  data,
  title,
  unit = '',
  referenceLineMin,
  referenceLineMax,
  referenceLabel,
  chartType = 'line',
  height = 180,
  primaryColor = Colors.dustyBlue,
  secondaryColor = Colors.blossomRose,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 48, 380);
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No historical readings recorded yet.</Text>
      </View>
    );
  }

  // Calculate scales
  const allValues = data.flatMap(d => [d.value, d.secondaryValue].filter((v): v is number => v !== undefined));
  if (referenceLineMin !== undefined) allValues.push(referenceLineMin);
  if (referenceLineMax !== undefined) allValues.push(referenceLineMax);

  const minValue = Math.max(0, Math.min(...allValues) * 0.85);
  const maxValue = Math.max(...allValues) * 1.15 || 100;
  const valueRange = maxValue - minValue || 1;

  const getY = (val: number) => {
    return paddingTop + innerHeight - ((val - minValue) / valueRange) * innerHeight;
  };

  const getX = (index: number) => {
    if (data.length === 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  };

  // Build SVG Path for line 1
  let pathD = '';
  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.value);
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Secondary path (for dual line BP diastolic)
  let secondaryPathD = '';
  if (chartType === 'dual_line') {
    data.forEach((d, i) => {
      if (d.secondaryValue !== undefined) {
        const x = getX(i);
        const y = getY(d.secondaryValue);
        if (i === 0) {
          secondaryPathD += `M ${x} ${y}`;
        } else {
          secondaryPathD += ` L ${x} ${y}`;
        }
      }
    });
  }

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleRow}>
          <Text style={styles.chartTitle}>{title}</Text>
          {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
        </View>
      )}

      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + innerHeight * ratio;
          const val = Math.round(maxValue - ratio * valueRange);
          return (
            <React.Fragment key={idx}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke={Colors.fineBorder}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <SvgText
                x={paddingLeft - 6}
                y={y + 4}
                fill={Colors.mutedText}
                fontSize={10}
                textAnchor="end"
              >
                {val}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Reference Range Line */}
        {referenceLineMax !== undefined && (
          <>
            <Line
              x1={paddingLeft}
              y1={getY(referenceLineMax)}
              x2={chartWidth - paddingRight}
              y2={getY(referenceLineMax)}
              stroke={Colors.blossomRose}
              strokeDasharray="2 2"
              strokeWidth={1.2}
            />
            {referenceLabel && (
              <SvgText
                x={chartWidth - paddingRight}
                y={getY(referenceLineMax) - 4}
                fill={Colors.deepBurgundy}
                fontSize={9}
                textAnchor="end"
              >
                {referenceLabel} ({referenceLineMax})
              </SvgText>
            )}
          </>
        )}

        {/* Chart rendering: Bar or Line */}
        {chartType === 'bar' ? (
          data.map((d, i) => {
            const x = getX(i) - 12;
            const y = getY(d.value);
            const barH = paddingTop + innerHeight - y;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={24}
                height={Math.max(2, barH)}
                rx={6}
                fill={primaryColor}
              />
            );
          })
        ) : (
          <>
            {/* Primary Line */}
            <Path d={pathD} fill="none" stroke={primaryColor} strokeWidth={2.5} strokeLinecap="round" />
            {data.map((d, i) => (
              <Circle
                key={`p_${i}`}
                cx={getX(i)}
                cy={getY(d.value)}
                r={4}
                fill={Colors.softWhite}
                stroke={primaryColor}
                strokeWidth={2}
              />
            ))}

            {/* Secondary Line (Diastolic) */}
            {chartType === 'dual_line' && secondaryPathD ? (
              <>
                <Path
                  d={secondaryPathD}
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
                {data.map((d, i) =>
                  d.secondaryValue !== undefined ? (
                    <Circle
                      key={`s_${i}`}
                      cx={getX(i)}
                      cy={getY(d.secondaryValue)}
                      r={3.5}
                      fill={Colors.softWhite}
                      stroke={secondaryColor}
                      strokeWidth={1.5}
                    />
                  ) : null
                )}
              </>
            ) : null}
          </>
        )}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          // Show label if reasonable number of points
          if (data.length > 7 && i % Math.ceil(data.length / 5) !== 0 && i !== data.length - 1) return null;
          return (
            <SvgText
              key={`lbl_${i}`}
              x={getX(i)}
              y={height - 6}
              fill={Colors.mutedText}
              fontSize={10}
              textAnchor="middle"
            >
              {d.date}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  chartTitle: {
    fontFamily: Typography.heading,
    fontSize: 15,
    color: Colors.lavenderSlate,
  },
  unitText: {
    fontSize: 12,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 16,
    marginVertical: 10,
  },
  emptyText: {
    color: Colors.mutedText,
    fontSize: 13,
  },
});

export default HealthChart;
