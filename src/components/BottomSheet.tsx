import GorhomBottomSheet, {
  BottomSheetView,
  type BottomSheetProps as GorhomProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, type ReactNode } from 'react';

import { colors, radius } from '@/theme';

type BottomSheetProps = Omit<GorhomProps, 'children'> & {
  children: ReactNode;
};

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  function BottomSheet({ children, snapPoints = ['50%', '90%'], ...rest }, ref) {
    return (
      <GorhomBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
        {...rest}
      >
        <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
      </GorhomBottomSheet>
    );
  },
);
