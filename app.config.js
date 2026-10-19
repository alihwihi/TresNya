module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (process.env.EAS_BUILD_PLATFORM === "android" && !mapsKey)
    throw new Error(
      "Add GOOGLE_MAPS_ANDROID_API_KEY to this EAS build environment before building the Android APK. See ANDROID_SETUP.md.",
    );
  return {
    ...config,
    scheme: "tresnya",
    android: {
      ...config.android,
      package: "com.alihnana.tresnya",
      versionCode: 1,
      allowBackup: false,
      permissions: [
        ...(config.android?.permissions || []),
        "android.permission.POST_NOTIFICATIONS",
      ],
      config: {
        ...config.android?.config,
        ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}),
      },
    },
    extra: { ...config.extra, androidMapsConfigured: !!mapsKey },
    plugins: [
      ...(config.plugins || []),
      [
        "expo-location",
        {
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
          isIosBackgroundLocationEnabled: false,
          locationWhenInUsePermission:
            "Izinkan TresNya mengakses lokasi hanya saat kamu memilih berbagi.",
        },
      ],
    ],
  };
};
