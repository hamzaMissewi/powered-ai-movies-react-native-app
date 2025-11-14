import { Stack as NativeStack } from "expo-router";
import React from "react";

interface StackProps extends React.ComponentProps<typeof NativeStack> {
  children?: React.ReactNode;
  screenOptions?: any; // Replace 'any' with the actual type if available
}

const BOTTOM_SHEET = {
  presentation: "modal" as const,
  animation: "fade" as const,
  gestureEnabled: true,
  sheetInitialDetentIndex: 0,
  sheetAllowedDetents: [0.5, 1.0],
};

export default function Stack({
  screenOptions,
  children,
  ...props
}: StackProps) {
  const processedChildren = React.Children.map(children, (child) => {
    if (
      React.isValidElement<{ sheet?: boolean; options?: any }>(child) &&
      child.props
    ) {
      const { sheet, ...restProps } = child.props;
      if (sheet) {
        return React.cloneElement(child, {
          ...restProps,
          options: {
            ...BOTTOM_SHEET,
            ...(restProps.options || {}),
          },
        });
      }
    }
    return child;
  });

  return (
    <NativeStack screenOptions={screenOptions} {...props}>
      {processedChildren}
    </NativeStack>
  );
}
