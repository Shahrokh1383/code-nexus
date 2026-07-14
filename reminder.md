خیلی خب ما در حال حاضر در برناممون دارای چند مشکل بسیار بزرگ هستیم که بطور کامل برات شرحش میدم :

1 : من میخوام که نحوه نمایش سیستم hierarchy برنامم در فرانت اند رو بطور کامل و دقیق ریفکتور کنی

2 : من میخوام نحوه نمایش hierarchy مستندات رو بصورت کارامد و ساده و زیبا و کاربرپسندانه درست کنی بطور کامل و دقیق و همینطور بهم تحویل بدی بدلیل اینکه سیستم فعلی گیج کننده و اذیت کننده هست 

3 : درحال حاضر لینک های مستند به مستند ایجاد میشن اما نمیتونیم لینک هارو حذف کنیم

4 : وقنی یک مستند رو انتخاب میکنیم باید فقط همان مستند رو با parent و children هاش نمایش بده و اصلا هم گیج کننده نباید باشه و بسیار ساده باید باشه و در صورتیکه خودش هم parent هست بطور کامل تمامی children های خودش رو هم نمایش بده

5 : حتما در صورتیکه مستندات children یک مستند هستن باید بطور کامل وقتی مستند اصلی که parent محسوب میشه رو حذف میکنیم بطور کامل migrate تمامی لینک های فایل های کد به children ها و این عمل باید بطور کامل و دقیق در فرانت اند هم به درستی نمایش داده بشه

6 : در حال حاضر مودال  FileTreePickerModal.tsx درحال حاضر اصلا نمیتونه مسیرهای درختی رو باز کنه و هرگونه کلیکیکه انجام میشه روی این اصلا باز نمیشن فولدرها

7 : مشکل دیگه ای که وجود داره این هست که در مودال FileTreePickerModal.tsx حتما باید یک هدری رو انتخاب کنیم تا وقتی از سایدبار پروژه مستندی رو انتخاب میکنیم به راحتی در هدر به کاربر نمایش داده بشه در مودال تا کاربر بدونه داره به چه مستندی لینک دهی رو انجام میده

توجه داشته باش که تمامی ریفکتور هارو باید بطور کامل و دقیق بصورت بهینه و کارامد انجام بدیم و به هیچ عنوان فایل های جدید نباید ساخته بشه و تمام فایل های موجود رو باید بطور کامل انالیز کنیم و سپس همین فایل هارو ریفکتور کنیم 

مسیر درختی پروژه من به شکل زیر هست :

📁 src/
├── 📁 domains/
│   └── 📁 linking/
│       ├── 📁 application/
│       │   ├── 📁 commands/
│       │   │   ├── 📄 create-bulk-code-links.command.ts
│       │   │   ├── 📄 create-document-link.command.ts
│       │   │   ├── 📄 create-link.command.ts
│       │   │   ├── 📄 migrate-links.command.ts
│       │   │   ├── 📄 remove-document-link.command.ts
│       │   │   └── 📄 remove-link.command.ts
│       │   ├── 📁 dto/
│       │   │   ├── 📄 code-to-doc-link.dto.ts
│       │   │   ├── 📄 document-link.dto.ts
│       │   │   ├── 📄 link-graph.dto.ts
│       │   │   └── 📄 link.dto.ts
│       │   ├── 📁 handlers/
│       │   │   ├── 📄 create-bulk-code-links.handler.ts
│       │   │   ├── 📄 create-document-link.handler.ts
│       │   │   ├── 📄 create-link.handler.ts
│       │   │   ├── 📄 get-document-children.handler.ts
│       │   │   ├── 📄 get-document-parents.handler.ts
│       │   │   ├── 📄 get-links-for-codefile.handler.ts
│       │   │   ├── 📄 get-links-for-document.handler.ts
│       │   │   ├── 📄 get-unlinked-codefiles.handler.ts
│       │   │   ├── 📄 migrate-links.handler.ts
│       │   │   ├── 📄 remove-document-link.handler.ts
│       │   │   └── 📄 remove-link.handler.ts
│       │   ├── 📁 ports/
│       │   │   └── 📄 code-file-query.port.ts
│       │   └── 📁 queries/
│       │       ├── 📄 get-document-children.query.ts
│       │       ├── 📄 get-document-parents.query.ts
│       │       ├── 📄 get-links-for-codefile.query.ts
│       │       ├── 📄 get-links-for-document.query.ts
│       │       └── 📄 get-unlinked-codefiles.query.ts
│       ├── 📁 domain/
│       │   ├── 📁 entities/
│       │   │   ├── 📄 code-to-doc-link.ts
│       │   │   ├── 📄 document-to-document-link.ts
│       │   │   └── 📄 link-graph.ts
│       │   ├── 📁 events/
│       │   │   ├── 📄 document-link-broken.ts
│       │   │   ├── 📄 document-link-created.ts
│       │   │   ├── 📄 link-broken.ts
│       │   │   ├── 📄 link-created.ts
│       │   │   └── 📄 links-migrated.ts
│       │   ├── 📁 repository/
│       │   │   ├── 📄 document-link-repository.interface.ts
│       │   │   └── 📄 link-repository.interface.ts
│       │   ├── 📁 services/
│       │   │   ├── 📄 document-link-validator.service.ts
│       │   │   └── 📄 link-migration.service.ts
│       │   └── 📁 value-objects/
│       │       ├── 📄 document-link-id.ts
│       │       ├── 📄 link-graph-id.ts
│       │       ├── 📄 link-id.ts
│       │       └── 📄 link-type.ts
│       └── 📁 infrastructure/
│           └── 📁 repository/
│               ├── 📄 document-link-json.repository.ts
│               └── 📄 link-json.repository.ts
├── 📁 presentation/
│   ├── 📁 components/
│   │   ├── 📁 common/
│   │   │   └── 📄 SearchBar.tsx
│   │   └── 📁 linking/
│   │       ├── 📄 DocumentHierarchy.tsx
│   │       ├── 📄 DocumentSourceList.tsx
│   │       ├── 📄 FileTreeNode.tsx
│   │       ├── 📄 FileTreePickerModal.css
│   │       ├── 📄 FileTreePickerModal.tsx
│   │       ├── 📄 InteractiveGraph.tsx
│   │       ├── 📄 LinkBadge.tsx
│   │       ├── 📄 LinkingPageHeader.tsx
│   │       ├── 📄 LinkingTabs.tsx
│   │       ├── 📄 PersistentDocumentSelector.tsx
│   │       ├── 📄 UnlinkedFilesList.css
│   │       └── 📄 UnlinkedFilesList.tsx
│   ├── 📁 hooks/
│   │   ├── 📁 linking/
│   │   │   ├── 📄 useFileTreePicker.ts
│   │   │   ├── 📄 useFilteredFileTree.ts
│   │   │   ├── 📄 useGraphData.ts
│   │   │   ├── 📄 useLinkCreation.ts
│   │   │   ├── 📄 useLinkingPageOrchestrator.ts
│   │   │   ├── 📄 useLinks.ts
│   │   │   ├── 📄 useSearchableList.ts
│   │   │   └── 📄 useUnlinkedFiles.ts
│   │   ├── 📄 useBackgroundWatcher.ts
│   │   ├── 📄 useDocuments.ts
│   │   ├── 📄 useFileTree.ts
│   │   ├── 📄 useIgnorePatterns.ts
│   │   ├── 📄 useIpc.ts
│   │   ├── 📄 useRecentWorkspaces.ts
│   │   ├── 📄 useTheme.ts
│   │   ├── 📄 useTracking.ts
│   │   └── 📄 useWorkspace.ts
│   ├── 📁 pages/
│   │   └── 📄 LinkingPage.tsx
│   ├── 📁 stores/
│   │   ├── 📄 documentation.store.ts
│   │   ├── 📄 filesystem.store.ts
│   │   ├── 📄 linking.store.ts
│   │   ├── 📄 tracking.store.ts
│   │   └── 📄 workspace.store.ts


حالا از تو میخوام که دقیقا مثل برنامه نویس سینیور با 12 سال تجربه عمل کنی و با رعایت اصول و شروط زیر  به refactor این بخش بپردازی :


1 : ریفکتور حتما و دقیقا باید طبق برنامه ریزی که برات قرار دادم باشه 

2 : ابتدا لیست تمام فایل هایی که باید چک بکنی تا به درک کامل برسی رو برام قرار بده و سپس به ریفکتور بپرداز و تا زمانی که اطلاعاتت تکمیل نشده به هیچ عنوان کدنویسیی رو انجام نده 

3 : برای تکمیل اطلاعاتت دائما به چرخه درخواست فایل ها از من ادامه بده

4 : در ریفکتور فایل ها و کدهای پروژه حتما به عنوان برنامه نویس سینیور با 12 سال تجربه عمل کن و حتما از اصول SOLID و SRP و KISS و DRY پیروی کن تا کد خوانا و تمیز و قابل توسعه داشته باشیم و همینطور به شدت تاکید دارم که از over engeneering دوری کنی

5 : برای ریفکتور کردن پس از اینکه به درک کاملی از الگوی کدنویسی و پیاده سازی های کدبیسم رسیدی بهم بگو قراره چکار بکنی بطور کامل و پس از ان با تایید و نظر من به جلو پیش برو 

6 : پس از اینکه ریفکتور به اتمام رسید حتما بهم تمام فایل هاییکه باید حذف بشن و Dead Code هارو بطور کامل و دقیق شناسایی کن و از کل کدبیس بهم کزارش بده تا بطور کامل حذف کنم تا کدبیس تمیز و سینیور لول داشته باشیم در کل پروژه و اگر هم هیچ کد و فایل بلا استفاده ای در کدبیسم وجود نداشت بهم بازهم گزارش بده که نیازی به حذف هیچ کدی نیست چون Dead code موحود نیست و هیچ فایلی بلا استفاده نیست 

7 : حتما در کدریویو هایی که انجام میدی در صورتیکه با کدها و فایل هایی مواجه شدی که anti-pattern هستن و از اصول SOLID و SRP و DRY و KISS رو رعایت نمیکنن حتما بصورت کامل ریفکتور رو روشون انجام بده و کدبیس رو به کدبیس Enterprise level و سینیور لول تبدیل کن با معماری scalable و maintainable

8 : حتما برای زیفکتور و باگ فیکس ها بطور کامل از مستندات constitution.md پیروی کن

9 : در طول انجام پروژه به زبان انگلیسی حرف بزن باهام بطور کامل و من بهت به فارسی جواب میدم 

حالا طبق اصول و شروطی که برات قرار دادم شروع به انجام کارها بکن
