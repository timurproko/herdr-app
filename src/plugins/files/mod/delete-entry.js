// Explicit, confirmed recycle-bin move on the captured machine. Never unlink/rm.
import { exec, window } from './host.js';

export function deletionPath({ root, path, on }) {
  if (typeof root !== 'string' || !/^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(root) || root.includes('\0') ||
      typeof path !== 'string' || path.includes('\0') || path.includes('\\') ||
      path.split('/').some(part => !part || part === '.' || part === '..') ||
      !(on == null || (typeof on === 'string' && on.length > 0))) {
    throw new Error('Cannot recycle an invalid file path');
  }
  return `${root.replace(/[\\/]+$/, '')}/${path}`;
}

// Windows' modern Shell operation, never legacy APIs that can permanently delete.
// The progress sink vetoes non-recycling deletes.
// Only fixed local volumes qualify; UNC/network/removable targets fail closed.
const WINDOWS_RECYCLE = String.raw`
using System;
using System.IO;
using System.Runtime.InteropServices;
[ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface RecycleItem {}
[ComImport, Guid("947AAB5F-0A5C-4C13-B4D6-4BF7836FC9F8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface RecycleOperation {
 [PreserveSig] int Advise(IntPtr sink, out uint cookie);
 [PreserveSig] int Unadvise(uint cookie);
 [PreserveSig] int SetOperationFlags(uint flags);
 [PreserveSig] int SetProgressMessage([MarshalAs(UnmanagedType.LPWStr)] string message);
 [PreserveSig] int SetProgressDialog(IntPtr dialog);
 [PreserveSig] int SetProperties(IntPtr properties);
 [PreserveSig] int SetOwnerWindow(IntPtr window);
 [PreserveSig] int ApplyPropertiesToItem(RecycleItem item);
 [PreserveSig] int ApplyPropertiesToItems(IntPtr items);
 [PreserveSig] int RenameItem(RecycleItem item, [MarshalAs(UnmanagedType.LPWStr)] string name, IntPtr sink);
 [PreserveSig] int RenameItems(IntPtr items, [MarshalAs(UnmanagedType.LPWStr)] string name);
 [PreserveSig] int MoveItem(RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name, IntPtr sink);
 [PreserveSig] int MoveItems(IntPtr items, RecycleItem destination);
 [PreserveSig] int CopyItem(RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name, IntPtr sink);
 [PreserveSig] int CopyItems(IntPtr items, RecycleItem destination);
 [PreserveSig] int DeleteItem(RecycleItem item, RecycleProgress sink);
 [PreserveSig] int DeleteItems(IntPtr items);
 [PreserveSig] int NewItem(RecycleItem destination, uint attributes, [MarshalAs(UnmanagedType.LPWStr)] string name, [MarshalAs(UnmanagedType.LPWStr)] string template, IntPtr sink);
 [PreserveSig] int PerformOperations();
 [PreserveSig] int GetAnyOperationsAborted([MarshalAs(UnmanagedType.Bool)] out bool aborted);
}
[ComVisible(true), Guid("04B0F1A7-9490-44BC-96E1-4296A31252E2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface RecycleProgress {
 [PreserveSig] int StartOperations();
 [PreserveSig] int FinishOperations(int result);
 [PreserveSig] int PreRenameItem(uint flags, RecycleItem item, [MarshalAs(UnmanagedType.LPWStr)] string name);
 [PreserveSig] int PostRenameItem(uint flags, RecycleItem item, [MarshalAs(UnmanagedType.LPWStr)] string name, int result, RecycleItem created);
 [PreserveSig] int PreMoveItem(uint flags, RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name);
 [PreserveSig] int PostMoveItem(uint flags, RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name, int result, RecycleItem created);
 [PreserveSig] int PreCopyItem(uint flags, RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name);
 [PreserveSig] int PostCopyItem(uint flags, RecycleItem item, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name, int result, RecycleItem created);
 [PreserveSig] int PreDeleteItem(uint flags, RecycleItem item);
 [PreserveSig] int PostDeleteItem(uint flags, RecycleItem item, int result, RecycleItem created);
 [PreserveSig] int PreNewItem(uint flags, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name);
 [PreserveSig] int PostNewItem(uint flags, RecycleItem destination, [MarshalAs(UnmanagedType.LPWStr)] string name, [MarshalAs(UnmanagedType.LPWStr)] string template, uint attributes, int result, RecycleItem created);
 [PreserveSig] int UpdateProgress(uint total, uint done);
 [PreserveSig] int ResetTimer();
 [PreserveSig] int PauseTimer();
 [PreserveSig] int ResumeTimer();
}
[ComVisible(true), ClassInterface(ClassInterfaceType.None)]
public class RecycleGuard : RecycleProgress {
 public bool Recycled; public int Result;
 public int StartOperations() { return 0; }
 public int FinishOperations(int result) { if (result < 0) Result = result; return 0; }
 public int PreRenameItem(uint f, RecycleItem i, string n) { return 0; }
 public int PostRenameItem(uint f, RecycleItem i, string n, int r, RecycleItem c) { return 0; }
 public int PreMoveItem(uint f, RecycleItem i, RecycleItem d, string n) { return 0; }
 public int PostMoveItem(uint f, RecycleItem i, RecycleItem d, string n, int r, RecycleItem c) { return 0; }
 public int PreCopyItem(uint f, RecycleItem i, RecycleItem d, string n) { return 0; }
 public int PostCopyItem(uint f, RecycleItem i, RecycleItem d, string n, int r, RecycleItem c) { return 0; }
 public int PreDeleteItem(uint flags, RecycleItem item) {
  return (flags & 0x80) != 0 ? 0 : unchecked((int)0x80004004); // TSF_DELETE_RECYCLE_IF_POSSIBLE or E_ABORT
 }
 public int PostDeleteItem(uint flags, RecycleItem item, int result, RecycleItem created) {
  Result = result; Recycled = result >= 0 && created != null; return 0;
 }
 public int PreNewItem(uint f, RecycleItem d, string n) { return 0; }
 public int PostNewItem(uint f, RecycleItem d, string n, string t, uint a, int r, RecycleItem c) { return 0; }
 public int UpdateProgress(uint t, uint d) { return 0; }
 public int ResetTimer() { return 0; }
 public int PauseTimer() { return 0; }
 public int ResumeTimer() { return 0; }
}
public static class CustomRecycle {
 [DllImport("shell32.dll", CharSet=CharSet.Unicode, PreserveSig=false)]
 static extern void SHCreateItemFromParsingName(string path, IntPtr bind, ref Guid id, out RecycleItem item);
 public static void Move(string path) {
  path = Path.GetFullPath(path);
  if (path.StartsWith(@"\\") || new DriveInfo(Path.GetPathRoot(path)).DriveType != DriveType.Fixed)
   throw new IOException("Recycle Bin is unavailable for this volume; the item was not deleted.");
  RecycleItem item = null; RecycleOperation operation = null;
  try {
   Guid id = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
   SHCreateItemFromParsingName(path, IntPtr.Zero, ref id, out item);
   operation = (RecycleOperation)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("3AD05575-8857-4850-9277-11B85BDB8E09")));
   // RECYCLEONDELETE, ADDUNDORECORD, EARLYFAILURE, NO_CONNECTED_ELEMENTS,
   // SILENT, NOCONFIRMATION, NOERRORUI. Do not enable junction traversal.
   Marshal.ThrowExceptionForHR(operation.SetOperationFlags(0x20080000 | 0x00100000 | 0x2000 | 0x4 | 0x10 | 0x400));
   RecycleGuard guard = new RecycleGuard();
   Marshal.ThrowExceptionForHR(operation.DeleteItem(item, guard));
   Marshal.ThrowExceptionForHR(operation.PerformOperations());
   bool aborted; Marshal.ThrowExceptionForHR(operation.GetAnyOperationsAborted(out aborted));
   Marshal.ThrowExceptionForHR(guard.Result);
   if (aborted || !guard.Recycled) throw new IOException("Windows did not confirm a Recycle Bin move. Check the original folder and Recycle Bin before retrying.");
   GC.KeepAlive(guard);
  } finally {
   if (operation != null) Marshal.FinalReleaseComObject(operation);
   if (item != null) Marshal.FinalReleaseComObject(item);
  }
 }
}
`;

export async function deleteEntry(target) {
  const path = deletionPath(target), on = target.on ?? null;
  const windows = () => {
    const quote = text => "'" + text.replace(/['‘’‚‛]/g, '$&$&') + "'";
    return exec('powershell', ['-NoProfile', '-NonInteractive', '-Sta', '-Command',
      "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);\n" +
      "try { Add-Type -TypeDefinition @'\n" + WINDOWS_RECYCLE + "\n'@\n" +
      `[CustomRecycle]::Move(${quote(path.replace(/\//g, '\\'))}) } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }`], { on });
  };
  let result;
  if ((!on && window()?.platform === 'windows') || /^[A-Za-z]:[\\/]|^\\\\|^\/\//.test(path)) result = await windows();
  else {
    // Let the target OS choose its own trash, for its login user. No rm fallback,
    // manual trash-directory moves, Finder UI, or permanent-delete commands.
    const mac = 'ObjC.import("Foundation"); function run(argv) { var error = Ref(); var ok = $.NSFileManager.defaultManager.trashItemAtURLResultingItemURLError($.NSURL.fileURLWithPath(argv[0]), null, error); if (!ok) throw Error(ObjC.unwrap(error[0].localizedDescription)); }';
    const script = 'case "$(uname -s)" in Darwin) exec osascript -l JavaScript -e "$2" -- "$1" ;; *) if command -v gio >/dev/null 2>&1; then exec gio trash -- "$1"; elif command -v trash-put >/dev/null 2>&1; then exec trash-put -- "$1"; else printf "%s\\n" "Trash is unavailable on this machine (install gio or trash-cli). The item was not deleted." >&2; exit 1; fi ;; esac';
    try { result = await exec('sh', ['-c', script, 'files-trash', path, mac], { on }); }
    catch (e) {
      if (on && String(e).includes('cannot start sh: program not found')) result = await windows();
      else throw e;
    }
  }
  if (result.code !== 0) throw new Error(result.stderr || `Could not move to the recycle bin (exit ${result.code})`);
}
