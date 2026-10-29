# DEFENSE Завдання 1: Фундамент і структура застосунку

**1. Намір і критерії:** Реалізувати бекенд менеджера завдань на базі NestJS, SQLite (Prisma) та Vanilla JS без сторонніх фронтенд-фреймворків із забезпеченням строгої типізації, валідації вхідних даних та автоматизованого контролю якості через Git-хуки. Специфікація: `spec.md`.

| № | Виявлена розбіжність | Опис дефекту | Коміт-виправлення (SHA) |
|:--|:---------------------|:-------------|:------------------------|
| 1 | Реєстрація модуля БД | У `spec.md` написано підключення `PrismaModule`, проте в `AppModule.imports` він був відсутній. | `2351e78` (`register PrismaModule in AppModule imports to match spec`) |
| 2 | Порожні класи DTO | Специфікація вимагає валідацію вхідних даних через `class-validator`, проте файли `CreateTaskDto` та `UpdateTaskDto` були порожніми класами без правил валідації. | `35ec809` (`implement class-validator rules in CreateTaskDto and UpdateTaskDto`) |
| 3 | Неправильні залежності та маршрутизація | Маршрут було оголошено як `tasks` замість `/api/tasks`. У контролері оператор `+id` зводив строковий UUID моделі Prisma до числа (`number`). Виправлено заміною на `ParseUUIDPipe` та строковий тип `id: string`. | `5092307` (`route to /api/tasks and replace invalid unary +id with ParseUUIDPipe`) |

**3. Ключове рішення:** Вибір NestJS + SQLite (Prisma ORM) + чистий JS замість frontend фреймворків і зовнішніх СУБД.

## 2. Перевірка блокування брудного» коміту через Git Hook

### Команда перевірки:
Спроба закомітити некоректний код із порушенням правил типізації TypeScript:

додав "const dirtyTestVariable: number = 'this is a dirty string';" в src/tasks/tasks.service.ts
git add src/tasks/tasks.service.ts
git commit -m "verify dirty commit rejection"

> app_project@0.0.1 typecheck
> tsc --noEmit

src/tasks/tasks.service.ts:28:7 - error TS2322: Type 'string' is not assignable to type 'number'.

28 const dirtyTestVariable: number = 'this is a dirty string';
         ~~~~~~~~~~~~~~~~~

Found 1 error in src/tasks/tasks.service.ts:28