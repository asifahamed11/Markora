!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\shell\EasyWebAIBot" "" "Open with Markora"
  WriteRegStr HKCU "Software\Classes\Directory\shell\EasyWebAIBot" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKCU "Software\Classes\Directory\shell\EasyWebAIBot\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" --folder $\"%1\.$\"'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\EasyWebAIBot" "" "Open with Markora"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\EasyWebAIBot" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\EasyWebAIBot\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" --folder $\"%V\.$\"'
!macroend
!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\shell\EasyWebAIBot"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\EasyWebAIBot"
!macroend
